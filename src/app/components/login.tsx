'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './login.module.css';

// Import UserContext
import { useUser } from '@/context/UserContext.tsx';

type Role = 'SUDO' | 'ADMIN';

export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [role, setRole] = useState<Role>('ADMIN');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');

  // Use context
  const { refreshUser } = useUser();

  // ===== Animated Network BG =====
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const CONFIG = {
      NODE_COUNT: 35,
      NODE_RADIUS: 1.3,
      CONNECTION_DISTANCE: 130,
      MAX_VELOCITY: 0.26,
      PULSE_SPEED: 0.002,
    };
    const COLORS = {
      NODE: 'rgba(255,255,255,0.9)',
      CONNECTION: 'rgba(255,0,80,0.16)'
    };
    let nodes: any[] = [];
    let animationId: number;

    class Node {
      x: number; y: number; vx: number; vy: number; radius: number; baseRadius: number; connections: Node[];
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = Math.random() * CONFIG.MAX_VELOCITY * 2 - CONFIG.MAX_VELOCITY;
        this.vy = Math.random() * CONFIG.MAX_VELOCITY * 2 - CONFIG.MAX_VELOCITY;
        this.radius = CONFIG.NODE_RADIUS;
        this.baseRadius = CONFIG.NODE_RADIUS;
        this.connections = [];
      }
      update(canvas: HTMLCanvasElement) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 12 || this.x > canvas.width - 12) this.vx *= -1;
        if (this.y < 12 || this.y > canvas.height - 12) this.vy *= -1;
        this.radius = this.baseRadius + Math.sin(Date.now() * CONFIG.PULSE_SPEED) * 0.6;
      }
      draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = COLORS.CONNECTION;
        ctx.lineWidth = 0.7;
        this.connections.forEach(node => {
          const distance = Math.hypot(this.x - node.x, this.y - node.y);
          const alpha = Math.max(0.10, 1 - distance / CONFIG.CONNECTION_DISTANCE);
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        });
        ctx.globalAlpha = 0.93;
        ctx.fillStyle = COLORS.NODE;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function initNodes(canvas: HTMLCanvasElement) {
      nodes = [];
      for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
        nodes.push(new Node(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ));
      }
    }

    function animateCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      nodes.forEach(node => {
        node.connections = [];
        nodes.forEach(other => {
          if (node !== other) {
            const distance = Math.hypot(node.x - other.x, node.y - other.y);
            if (distance < CONFIG.CONNECTION_DISTANCE) {
              node.connections.push(other);
            }
          }
        });
      });

      nodes.forEach(node => {
        node.update(canvas);
        node.draw(ctx);
      });

      animationId = requestAnimationFrame(animateCanvas);
    }

    function resizeCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes(canvas);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animateCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Helper: wrap geolocation in a Promise
  function getCurrentPosition(): Promise<{ latitude: number; longitude: number; }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }),
        (err) => reject(err)
      );
    });
  }

  // 1) Send credentials to request OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
          phone: role === 'SUDO' ? phone.trim() : undefined
        })
      });
      const data = await res.json();
      if (data.ok) {
        setShowOtpModal(true);
      } else {
        setError(data.error || 'OTP send failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 2) Verify OTP, capture geo + device, then notify parent
  const handleVerify = async () => {
    setError(null);
    try {
      let latitude: number | undefined, longitude: number | undefined;
      try {
        const pos = await getCurrentPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } catch { }
      const deviceInfo = { userAgent: window.navigator.userAgent };
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          role,
          phone: role === 'SUDO' ? phone.trim() : undefined,
          code: otp,
          rememberMe,
          latitude,
          longitude,
          deviceInfo
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        // Optionally username ke liye, agar UI me use ho raha hai:
        localStorage.setItem('username', username.trim());
        setShowOtpModal(false);
        // Context ko refresh karo login ke turant baad:
        refreshUser();
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid or expired OTP');
        setShowOtpModal(false);
      }
    } catch (err: any) {
      setError(err.message);
      setShowOtpModal(false);
    }
  };

  useEffect(() => {
    if (showOtpModal) setError(null);
  }, [showOtpModal]);

  return (
    <div className={styles.container}>
      {/* Network animated background */}
      <canvas ref={canvasRef} className={styles.networkBg} />

      <div className={styles.loginCol}>
        <h2 className={styles.title}>Login</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={styles.select}
            >
              <option value="SUDO">SUDO</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          {role === 'SUDO' && (
            <div className={styles.field}>
              <label className={styles.label}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={styles.input}
              />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((v) => !v)}
                className={styles.eyeButton}
              >
                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              id="rememberMe"
            />
            <label htmlFor="rememberMe" className={styles.checkboxLabel}>
              Remember Me
            </label>
          </div>
          <button type="submit" className={styles.primaryButton}>
            Login / Send OTP
          </button>
          {error && <p className={styles.errorText}>{error}</p>}
        </form>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Enter OTP</h2>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className={styles.input}
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowOtpModal(false)}
                className={styles.secondaryButton}
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                className={styles.primaryButton}
              >
                Submit
              </button>
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
