import { useEffect, useRef } from "react";

export default function BackgroundShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
      // Clean up resize observer
      return () => resizeObserver.disconnect();
    } else {
      window.addEventListener("resize", syncSize);
    }
    syncSize();

    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const vs = `attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }`;

    const fs = `precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_is_dark;

      // Simple random function for noise
      float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          
          // Generate high-frequency noise (animated slightly by time)
          float n = random(uv + mod(u_time * 0.1, 10.0));
          
          // Very dark gray for dark mode, very light gray for light mode
          vec3 baseColor = mix(vec3(0.97, 0.98, 0.99), vec3(0.02, 0.02, 0.02), u_is_dark);
          
          // Add subtle grain (darker grain in light mode, lighter grain in dark mode)
          float grainStrength = mix(-0.02, 0.02, u_is_dark);
          vec3 finalColor = baseColor + vec3(n * grainStrength);
          
          // Subtle Vignette
          float dist = distance(uv, vec2(0.5));
          finalColor *= mix(1.0 + dist * 0.1, 1.0 - dist * 0.3, u_is_dark);

          gl_FragColor = vec4(finalColor, 1.0);
      }`;

    function cs(type: number, src: string) {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    if (!prog) return;

    const vertexShader = cs(gl.VERTEX_SHADER, vs);
    const fragmentShader = cs(gl.FRAGMENT_SHADER, fs);

    if (vertexShader) gl.attachShader(prog, vertexShader);
    if (fragmentShader) gl.attachShader(prog, fragmentShader);

    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uIsDark = gl.getUniformLocation(prog, "u_is_dark");

    let animationFrameId: number;

    function render(t: number) {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uIsDark) {
        const isDark = document.documentElement.classList.contains("dark") ? 1.0 : 0.0;
        gl.uniform1f(uIsDark, isDark);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", syncSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-80 pointer-events-none fixed top-0 left-0 z-[-2]"
      />
    </div>
  );
}
