import { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import './ARModal.css';

export type ARTipo = 'inicio' | 'acierto' | 'fin';

export interface ARContenido {
    texto?: string;
    imagen?: string;
    audio?: string;
    video?: string;
}

interface ARModalProps {
    tipo: ARTipo;
    contenido: ARContenido;
    fondo?: string;
    onClose: () => void;
}

// ── Símbolos flotantes ────────────────────────────────────────────────────
const MATH_SYMBOLS = ['×', '+', '÷', '-', '=', '1', '2', '3'];

const createFloatingSymbols = (container: HTMLDivElement): (() => void) => {
    const uid   = `ar_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const nodes: HTMLElement[]      = [];
    const styles: HTMLStyleElement[] = [];

    MATH_SYMBOLS.forEach((sym, i) => {
        const el   = document.createElement('div');
        el.textContent = sym;
        const size = Math.random() * 30 + 20;
        const dur  = Math.random() * 5  + 5;
        const left = Math.random() * 80 + 10;
        const top  = Math.random() * 80 + 10;
        const dx   = Math.random() * 30 - 15;
        const dy   = Math.random() * 30 - 15;
        const rot  = Math.random() * 30 - 15;
        const anim = `arF_${uid}_${i}`;

        el.style.cssText = `position:absolute;color:rgba(255,255,255,0.2);font-size:${size}px;`
            + `animation:${anim} ${dur}s ease-in-out infinite;left:${left}%;top:${top}%;`
            + `pointer-events:none;user-select:none;`;

        const st = document.createElement('style');
        st.textContent = `@keyframes ${anim}{0%,100%{transform:translate(0,0) rotate(0deg)}`
            + `50%{transform:translate(${dx}px,${dy}px) rotate(${rot}deg)}}`;

        document.head.appendChild(st);
        container.appendChild(el);
        nodes.push(el);
        styles.push(st);
    });

    return () => { nodes.forEach(n => n.remove()); styles.forEach(s => s.remove()); };
};

// ── Escena Three.js por tipo de contenido ────────────────────────────────
const initThreeForType = (
    container: HTMLDivElement,
    type: 'Texto' | 'Imagen' | 'Video',
    content: string,
): () => void => {
    let disposed = false;
    let frameId  = 0;
    let videoEl: HTMLVideoElement | null = null;
    let portalGroup: THREE.Group | null = null;
    let portalFrameGroup: THREE.Group | null = null;
    let portalGlow: THREE.Mesh | null = null;
    let portalParticles: THREE.Points | null = null;
    let portalParticleMeta: { angle: number; radius: number; depth: number }[] | null = null;

    const enableRootSpin = type !== 'Video';
    const planeBaseSize  = type === 'Video' ? 2.8 : 1.8;

    const W = container.clientWidth  || 300;
    const H = container.clientHeight || 200;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = type === 'Video' ? 3.2 : 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    // helpers
    const mkTextTex = (text: string): THREE.CanvasTexture => {
        const cv  = document.createElement('canvas');
        const cx  = cv.getContext('2d')!;
        const lines = String(text).split(/\r?\n/);
        const fs  = 48, lh = Math.round(fs * 1.2), pad = 28;
        cx.font   = `${fs}px Arial`;
        const mw  = Math.max(...lines.map(l => cx.measureText(l).width), 1);
        cv.width  = Math.min(Math.max(mw + pad * 2, 256), 1024);
        cv.height = Math.min(lines.length * lh + pad * 2, 1024);
        cx.fillStyle = 'rgba(255,255,255,0.9)';
        cx.fillRect(0, 0, cv.width, cv.height);
        cx.fillStyle = '#0b2a4a'; cx.textBaseline = 'top'; cx.font = `${fs}px Arial`;
        lines.forEach((l, i) => cx.fillText(l, pad, pad + i * lh));
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    };

    const mkGlowTex = (): THREE.CanvasTexture => {
        const cv = document.createElement('canvas');
        const cx = cv.getContext('2d')!;
        cv.width = cv.height = 256;
        const g  = cx.createRadialGradient(128, 128, 10, 128, 128, 128);
        g.addColorStop(0,    'rgba(0,255,255,0.45)');
        g.addColorStop(0.45, 'rgba(0,200,255,0.2)');
        g.addColorStop(1,    'rgba(0,140,255,0)');
        cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    };

    const portalFrameMat = new THREE.MeshStandardMaterial({
        color: 0x83f3ff, emissive: 0x40e0ff, emissiveIntensity: 0.85,
        roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.95,
    });

    const updatePortalFrame = (fw: number, fh: number) => {
        if (!portalFrameGroup) return;
        portalFrameGroup.children.forEach(c => { (c as THREE.Mesh).geometry?.dispose(); });
        portalFrameGroup.clear();
        const t = 0.09, d = 0.18, hw = fw / 2, hh = fh / 2;
        const bars: [number, number, number, number][] = [
            [0,         hh + t / 2, fw + t * 2, t],
            [0,        -hh - t / 2, fw + t * 2, t],
            [-hw - t / 2, 0,         t,          fh],
            [ hw + t / 2, 0,         t,          fh],
        ];
        bars.forEach(([x, y, w, h]) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), portalFrameMat);
            m.position.set(x, y, 0);
            portalFrameGroup!.add(m);
        });
        if (portalParticles && portalParticleMeta) {
            const attr = portalParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
            const pos  = attr.array as Float32Array;
            const br   = Math.hypot(hw, hh) * 1.08;
            const ds   = Math.min(0.5, br * 0.2);
            portalParticleMeta.forEach(({ angle, radius, depth }, i) => {
                const r = br * radius;
                pos[i * 3]     = Math.cos(angle) * r;
                pos[i * 3 + 1] = Math.sin(angle) * r;
                pos[i * 3 + 2] = depth * ds;
            });
            attr.needsUpdate = true;
            (portalParticles.material as THREE.PointsMaterial).size = Math.max(0.04, br * 0.03);
        }
    };

    // ── Texto 3D ──────────────────────────────────────────────────────────
    if (type === 'Texto') {
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dir = new THREE.DirectionalLight(0xffffff, 1.5);
        dir.position.set(2, 3, 4); scene.add(dir);

        // Helvetiker solo soporta ASCII básico; normaliza tildes y símbolos españoles
        const normalizeForFont = (t: string): string =>
            t.normalize('NFD')
             .replace(/[̀-ͯ]/g, '')   // elimina diacríticos (á→a, é→e…)
             .replace(/¡/g, '!')
             .replace(/¿/g, '?')
             .replace(/Ñ/g, 'N')
             .replace(/ñ/g, 'n');

        const buildMeshes = (font: any) => {
            if (disposed) return;
            const tg  = new THREE.Group(); root.add(tg);
            const sz  = 0.1, dep = 0.02, lh = sz * 1.35;
            const mat = new THREE.MeshStandardMaterial({
                color: 0xffffff, roughness: 0.1, metalness: 0,
                emissive: 0xffffff, emissiveIntensity: 0.2,
            });
            const lines = String(content || '').split(/\r?\n/).map(normalizeForFont);
            const ws: number[] = [];
            lines.forEach((line, idx) => {
                const geo = new TextGeometry(line || ' ', {
                    font, size: sz, depth: dep, curveSegments: 12,
                    bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3,
                });
                geo.computeBoundingBox();
                const box = geo.boundingBox;
                const gw  = box ? box.max.x - box.min.x : 1;
                ws.push(gw);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.x = -gw / 2;
                mesh.position.y = ((lines.length - 1) / 2 - idx) * lh;
                tg.add(mesh);
            });
            tg.scale.setScalar(2.5 / Math.min(1, ...ws));
        };

        const fallbackPlane = () => {
            if (disposed) return;
            const tex = mkTextTex(content);
            const asp = tex.image.width / tex.image.height;
            const pw  = asp >= 1 ? 1.8 : 1.8 * asp;
            const ph  = asp >= 1 ? 1.8 / asp : 1.8;
            root.add(new THREE.Mesh(
                new THREE.PlaneGeometry(pw, ph),
                new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
            ));
        };

        new FontLoader().load(
            'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/fonts/helvetiker_regular.typeface.json',
            buildMeshes,
            undefined,
            fallbackPlane,
        );

    // ── Imagen ───────────────────────────────────────────────────────────
    } else if (type === 'Imagen') {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(content, tex => {
            if (disposed) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            const asp = tex.image.width / tex.image.height;
            const pw  = asp >= 1 ? 1.8 : 1.8 * asp;
            const ph  = asp >= 1 ? 1.8 / asp : 1.8;
            root.add(new THREE.Mesh(
                new THREE.PlaneGeometry(pw, ph),
                new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
            ));
            const bt = tex.clone();
            bt.colorSpace = THREE.SRGBColorSpace;
            bt.wrapS = THREE.RepeatWrapping; bt.repeat.x = -1; bt.offset.x = 1; bt.needsUpdate = true;
            const pb = new THREE.Mesh(
                new THREE.PlaneGeometry(pw, ph),
                new THREE.MeshBasicMaterial({ map: bt, transparent: true }),
            );
            pb.rotation.y = Math.PI;
            root.add(pb);
        });

    // ── Video con efecto portal ───────────────────────────────────────────
    } else if (type === 'Video') {
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }),
        );
        const fitAsp = (asp: number) => {
            if (!asp) return;
            const pw = asp >= 1 ? planeBaseSize : planeBaseSize * asp;
            const ph = asp >= 1 ? planeBaseSize / asp : planeBaseSize;
            plane.scale.set(pw, ph, 1);
            if (portalGlow) portalGlow.scale.set(pw * 1.3, ph * 1.3, 1);
            updatePortalFrame(pw, ph);
        };

        videoEl = document.createElement('video');
        videoEl.src = content; videoEl.crossOrigin = 'anonymous';
        videoEl.loop = true; videoEl.muted = true; videoEl.playsInline = true; videoEl.preload = 'auto';
        const vtex         = new THREE.VideoTexture(videoEl);
        vtex.colorSpace    = THREE.SRGBColorSpace;
        plane.material     = new THREE.MeshBasicMaterial({ map: vtex, transparent: true, opacity: 0.96 });

        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const rim = new THREE.PointLight(0x7ffcff, 1.1);
        rim.position.set(2.5, 2.2, 3.5); scene.add(rim);

        portalGroup = new THREE.Group();
        plane.position.z = -0.06; portalGroup.add(plane);

        portalGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                map: mkGlowTex(), transparent: true,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }),
        );
        portalGlow.position.z = -0.14; portalGroup.add(portalGlow);

        portalFrameGroup = new THREE.Group(); portalGroup.add(portalFrameGroup);

        const pCount = 160;
        const pPos   = new Float32Array(pCount * 3);
        portalParticleMeta = [];
        for (let i = 0; i < pCount; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = 0.85 + Math.random() * 0.35;
            const depth  = Math.random() - 0.5;
            portalParticleMeta.push({ angle, radius, depth });
            pPos[i * 3]     = Math.cos(angle) * radius;
            pPos[i * 3 + 1] = Math.sin(angle) * radius;
            pPos[i * 3 + 2] = depth * 0.4;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        portalParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
            color: 0x7df9ff, size: 0.05, transparent: true, opacity: 0.8,
            depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        portalGroup.add(portalParticles);
        root.add(portalGroup);
        fitAsp(16 / 9);

        videoEl.addEventListener('loadedmetadata', () => {
            if (videoEl!.videoWidth && videoEl!.videoHeight) {
                fitAsp(videoEl!.videoWidth / videoEl!.videoHeight);
            }
        });
        videoEl.play().catch(() => {});
    }

    // ── Bucle de animación ────────────────────────────────────────────────
    const animate = () => {
        if (disposed) return;
        if (enableRootSpin) root.rotation.y += 0.008;
        if (portalGroup) {
            const now = performance.now();
            portalGroup.position.y = Math.sin(now * 0.0011) * 0.06;
            portalGroup.position.x = Math.cos(now * 0.0009) * 0.02;
            portalGroup.rotation.z = Math.sin(now * 0.0006) * 0.04;
            portalGroup.rotation.y = Math.cos(now * 0.0005) * 0.04;
        }
        if (portalParticles) {
            portalParticles.rotation.z += 0.002;
            portalParticles.rotation.y += 0.001;
        }
        frameId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
    };
    animate();

    return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        if (videoEl) { videoEl.pause(); videoEl.src = ''; videoEl.load(); }
        scene.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach(m => { if ((m as any).map) (m as any).map.dispose(); m.dispose(); });
            }
        });
        renderer.dispose();
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
    };
};

// ── Componente ────────────────────────────────────────────────────────────
const ARModal: FC<ARModalProps> = ({ tipo, contenido, fondo, onClose }) => {
    const text     = contenido.texto?.trim()  ?? '';
    const imageUrl = contenido.imagen?.trim() ?? '';
    const audioUrl = contenido.audio?.trim()  ?? '';
    const videoUrl = contenido.video?.trim()  ?? '';

    const hasText  = !!text;
    const hasImage = !!imageUrl;
    const hasAudio = !!audioUrl;
    const hasVideo = !!videoUrl;

    const visualCount = [hasText, hasImage, hasVideo].filter(Boolean).length;
    const isAudioOnly = hasAudio && visualCount === 0;

    const bgElementsRef = useRef<HTMLDivElement>(null);
    const videoFeedRef  = useRef<HTMLVideoElement>(null);
    const textRef       = useRef<HTMLDivElement>(null);
    const imageRef      = useRef<HTMLDivElement>(null);
    const videoRef      = useRef<HTMLDivElement>(null);
    const audioRef      = useRef<HTMLAudioElement>(null);
    const streamRef     = useRef<MediaStream | null>(null);

    useEffect(() => {
        // Símbolos flotantes
        const cleanupSymbols = bgElementsRef.current
            ? createFloatingSymbols(bgElementsRef.current)
            : undefined;

        // Camara frontal (solo acierto)
        if (tipo === 'acierto' && videoFeedRef.current) {
            navigator.mediaDevices
                .getUserMedia({ video: { facingMode: 'user' }, audio: false })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoFeedRef.current) {
                        videoFeedRef.current.srcObject = stream;
                        videoFeedRef.current.play().catch(() => {});
                    }
                })
                .catch(() => {});
        }

        // Audio
        if (audioRef.current && audioUrl) {
            audioRef.current.play().catch(() => {});
        }

        // Escenas Three.js por tipo
        const cleanups: (() => void)[] = [];
        if (hasText  && textRef.current)  cleanups.push(initThreeForType(textRef.current,  'Texto',  text));
        if (hasImage && imageRef.current) cleanups.push(initThreeForType(imageRef.current, 'Imagen', imageUrl));
        if (hasVideo && videoRef.current) cleanups.push(initThreeForType(videoRef.current, 'Video',  videoUrl));

        return () => {
            cleanupSymbols?.();
            cleanups.forEach(c => c());
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Color de fondo para etapas sin cámara
    const cardStyle = tipo !== 'acierto'
        ? { background: '#1a1a2e' }
        : {};

    // Layout del contenido
    const textJsx  = hasText  && <div className="ar-multi-text-3d" ><div ref={textRef}  className="ar-three-container" /></div>;
    const imageJsx = hasImage && <div className="ar-multi-image"   ><div ref={imageRef} className="ar-three-container" /></div>;
    const videoJsx = hasVideo && <div className="ar-multi-video"   ><div ref={videoRef} className="ar-three-container" /></div>;
    const audioJsx = hasAudio && (
        isAudioOnly
            ? (
                <div className="ar-audio-solo">
                    <div className="ar-audio-icon">🎵</div>
                    <audio loop ref={audioRef} controls src={audioUrl} className="ar-audio-player" />
                </div>
            )
            : <audio loop ref={audioRef} autoPlay src={audioUrl} style={{ display: 'none' }} />
    );

    const renderLayout = () => {
        if (isAudioOnly) {
            return <div className="ar-layout-single">{audioJsx}</div>;
        }
        return <>{textJsx}{imageJsx}{videoJsx}{audioJsx}</>;
    };

    return (
        <div className="ar-modal-overlay" onClick={onClose}>
            <div
                className="ar-modal-card"
                style={cardStyle}
                onClick={e => e.stopPropagation()}
            >
                {/* Feed de cámara (acierto) */}
                {tipo === 'acierto' && (
                    <video ref={videoFeedRef} className="ar-camera-feed" autoPlay playsInline muted />
                )}

                {/* Símbolos flotantes */}
                <div ref={bgElementsRef} className="ar-bg-elements" />

                {/* Área de contenido */}
                <div className="ar-content-area">
                    <div className="ar-multi-content">
                        {renderLayout()}
                    </div>
                </div>

                <div className="ar-footer">
                    <button className="ar-close-btn" onClick={onClose}>Continuar</button>
                </div>
            </div>
        </div>
    );
};

export default ARModal;
