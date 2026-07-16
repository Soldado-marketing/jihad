'use client';

/**
 * NeuralHubPreview — Isolated futuristic RTL Arabic dashboard prototype.
 *
 * Rules enforced here:
 *  - No backend calls: all data is static.
 *  - Three.js runs ONLY inside useEffect (browser-only).
 *  - Full cleanup (renderer.dispose, geometry.dispose, material.dispose,
 *    cancelAnimationFrame, removeEventListener) on unmount.
 *  - This component is loaded via next/dynamic with ssr:false — window/document
 *    are always available when this module executes.
 *  - Do NOT touch auth, login, register, admin, Prisma, or API files.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './neural-hub.module.css';

// ── Static data ────────────────────────────────────────────────────────────────

const CLIENTS = [
  { name: 'مجموعة التقنية المتقدمة', status: 'active' as const },
  { name: 'شركة الإبداع الرقمي',     status: 'active' as const },
  { name: 'مؤسسة النمو الذكي',        status: 'review' as const },
  { name: 'وكالة التسويق الحديث',    status: 'active' as const },
  { name: 'شركة الحلول المتكاملة',   status: 'review' as const },
];

const STATS = [
  { value: '47',   label: 'حملة نشطة',   green: false },
  { value: '12',   label: 'طلب معلق',    green: false },
  { value: '94٪', label: 'معدل النجاح',  green: true },
  { value: '8.2K', label: 'وصول اليوم',  green: true },
];

const CAMPAIGNS = [
  { name: 'حملة رمضان 2026',  reach: '4.5K', status: 'live'      as const },
  { name: 'إطلاق منتج جديد',   reach: '2.1K', status: 'live'      as const },
  { name: 'التوعية الصيفية',   reach: '1.6K', status: 'scheduled' as const },
  { name: 'برنامج الولاء',     reach: '0.9K', status: 'scheduled' as const },
];

const EMOTION_VALUE = 78; // 0–100

// SVG arc geometry constants
const ARC_R          = 70;
const ARC_HALF_CIRC  = Math.PI * ARC_R;         // full half-circle length
const ARC_FILL       = (EMOTION_VALUE / 100) * ARC_HALF_CIRC;
const ARC_OFFSET     = ARC_HALF_CIRC - ARC_FILL; // dashoffset for progress

// ── Three.js globe factory ─────────────────────────────────────────────────────

function buildGlobe(canvas: HTMLCanvasElement): () => void {
  const W = canvas.offsetWidth  || 480;
  const H = canvas.offsetHeight || 260;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.z = 2.8;

  // Renderer — transparent background so CSS panel colour shows through
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  // ── Globe wireframe (cyan)
  const sphereGeo = new THREE.SphereGeometry(1, 28, 18);
  const wireGeo   = new THREE.EdgesGeometry(sphereGeo);
  const wireMat   = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.22 });
  const wireframe = new THREE.LineSegments(wireGeo, wireMat);
  scene.add(wireframe);

  // ── Inner glow sphere
  const glowGeo  = new THREE.SphereGeometry(0.98, 20, 14);
  const glowMat  = new THREE.MeshBasicMaterial({ color: 0x001a3a, transparent: true, opacity: 0.55 });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glowMesh);

  // ── Surface nodes (random points on sphere)
  const nodeCount = 200;
  const positions = new Float32Array(nodeCount * 3);
  for (let i = 0; i < nodeCount; i++) {
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);
    const radius = 1 + (Math.random() * 0.04 - 0.02);
    positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMat = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.025, transparent: true, opacity: 0.8 });
  const points    = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  // ── Ambient light to slightly lift the glow sphere edge
  const ambient = new THREE.AmbientLight(0x002244, 0.6);
  scene.add(ambient);

  // ── Animation loop
  let frameId = 0;
  const tick = () => {
    frameId = requestAnimationFrame(tick);
    wireframe.rotation.y += 0.003;
    wireframe.rotation.x += 0.001;
    points.rotation.y    += 0.003;
    points.rotation.x    += 0.001;
    renderer.render(scene, camera);
  };
  tick();

  // ── Resize handler
  const onResize = () => {
    const w = canvas.offsetWidth  || W;
    const h = canvas.offsetHeight || H;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // ── Cleanup function (returned to useEffect)
  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    // dispose geometries + materials to free GPU memory
    sphereGeo.dispose();
    wireGeo.dispose();
    wireMat.dispose();
    glowGeo.dispose();
    glowMat.dispose();
    pointsGeo.dispose();
    pointsMat.dispose();
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NeuralHubPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // canvasRef.current is guaranteed to be non-null by the time useEffect runs
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = buildGlobe(canvas);
    return cleanup;
  }, []);

  return (
    <div className={styles.root} dir="rtl">

      {/* ── Prototype banner ───────────────────────────────────────────────── */}
      <div className={styles.prototypeBanner}>
        Neural Hub Preview — Prototype &nbsp;|&nbsp; بيانات تجريبية فقط — غير متصل بالنظام
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>⬡ المركز العصبي</h1>
          <p className={styles.headerSub}>لوحة التحكم الذكية — رؤية المستقبل</p>
        </div>
        <span className={styles.headerDot}>متصل بالشبكة</span>
      </header>

      {/* ── Main grid: globe (left) + right column ─────────────────────────── */}
      <div className={styles.grid}>

        {/* ── 3D Globe panel ─────────────────────────────────────────────── */}
        <div className={styles.globePanel}>
          <span className={styles.globeLabel}>خريطة النشاط الجغرافي — بث مباشر</span>
          <canvas
            ref={canvasRef}
            className={styles.globeCanvas}
            aria-label="كرة أرضية ثلاثية الأبعاد"
          />
          <div className={styles.globeScanLine} aria-hidden="true" />
        </div>

        {/* ── Right column ───────────────────────────────────────────────── */}
        <div className={styles.rightCol}>

          {/* Stats grid */}
          <div className={styles.statsGrid}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statCard}>
                <div className={`${styles.statValue}${s.green ? ` ${styles.green}` : ''}`}>
                  {s.value}
                </div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Clients card */}
          <div className={styles.clientsCard}>
            <div className={styles.cardTitle}>العملاء النشطون</div>
            {CLIENTS.map((c) => (
              <div key={c.name} className={styles.clientRow}>
                <span className={styles.clientName}>{c.name}</span>
                <span className={`${styles.clientBadge} ${c.status === 'active' ? styles.active : styles.review}`}>
                  {c.status === 'active' ? 'نشط' : 'مراجعة'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: emotion meter + campaigns ──────────────────────────── */}
      <div className={styles.bottomRow}>

        {/* Emotion meter */}
        <div className={styles.emotionPanel}>
          <div className={styles.cardTitle}>مقياس المشاعر — الجمهور المستهدف</div>
          <div className={styles.meterWrap}>
            <div className={styles.meterArc} aria-label={`مشاعر إيجابية ${EMOTION_VALUE}٪`}>
              <svg viewBox="0 0 160 84" xmlns="http://www.w3.org/2000/svg">
                {/* Track */}
                <path
                  d={`M 10,80 A ${ARC_R},${ARC_R} 0 0 1 150,80`}
                  fill="none"
                  stroke="rgba(0,200,255,0.12)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Fill (animated progress) */}
                <path
                  d={`M 10,80 A ${ARC_R},${ARC_R} 0 0 1 150,80`}
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${ARC_HALF_CIRC.toFixed(1)}`}
                  strokeDashoffset={`${ARC_OFFSET.toFixed(1)}`}
                  style={{ filter: 'drop-shadow(0 0 6px #00ff88)' }}
                />
                {/* Centre label */}
                <text x="80" y="72" textAnchor="middle" fill="#00ff88" fontSize="22" fontWeight="800"
                  style={{ textShadow: '0 0 10px #00ff88' }}>
                  {EMOTION_VALUE}٪
                </text>
              </svg>
            </div>
            <div className={styles.meterLabel}>إيجابي للغاية · تفاعل مرتفع</div>
          </div>
        </div>

        {/* Campaigns list */}
        <div className={styles.campaignPanel}>
          <div className={styles.cardTitle}>الحملات الجارية</div>
          {CAMPAIGNS.map((c) => (
            <div key={c.name} className={styles.campaignRow}>
              <span className={styles.campaignName}>{c.name}</span>
              <span className={styles.campaignReach}>{c.reach}</span>
              <span className={`${styles.campaignStatus} ${c.status === 'live' ? styles.live : styles.scheduled}`}>
                {c.status === 'live' ? 'مباشر' : 'مجدول'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Voice command bar ───────────────────────────────────────────────── */}
      <div className={styles.voiceBar}>
        <div className={styles.voiceIcon} aria-hidden="true">🎙</div>
        <p className={styles.voiceText}>
          جاهز للاستماع… قل <strong>&quot;عرض الحملات&quot;</strong> أو <strong>&quot;تحليل العملاء&quot;</strong>
        </p>
        <div className={styles.voiceWave} aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={styles['voiceBar__bar']} />
          ))}
        </div>
      </div>

    </div>
  );
}
