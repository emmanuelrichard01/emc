import { useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import gsap from "gsap";

const LogoAnimated = () => {
  const { theme } = useTheme();
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const groupRef = useRef<SVGGElement | null>(null);

  // Use style2 as the base logo
  const style2 = [
    "M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z",
    "M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z",
    "M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z"
  ];

  // Dynamic theme colors
  const strokeColor = theme === "dark" ? "#fefef5" : "#090908"; // white in dark, purple in light
  const gradientStart = strokeColor;
  // const gradientEnd = "#BC13FE"; // highlight
  const glowColor = strokeColor; // neon glow matches stroke

  useEffect(() => {
    const paths = pathRefs.current.filter(Boolean) as SVGPathElement[];
    if (paths.length === 0) return;

    const lengths = paths.map((p) => p.getTotalLength());

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 0,
      defaults: { ease: "power2.inOut" },
    });

    tl.add("cycleStart")
      .set(paths, { opacity: 1, stroke: strokeColor }, "cycleStart")
      .set(groupRef.current, { opacity: 1, fill: "none" }, "cycleStart")
      .add(() => {
        paths.forEach((p, i) => {
          gsap.set(p, {
            strokeDasharray: lengths[i],
            strokeDashoffset: lengths[i],
          });
        });
      }, "cycleStart");

    tl.to(paths, { strokeDashoffset: 0, duration: 1.2 }, "cycleStart");
    tl.to(groupRef.current, { fill: "url(#gradient)", duration: 0.6 }, ">-0.2");
    tl.to({}, { duration: 10 });
    tl.to([...paths, groupRef.current].filter(Boolean) as Element[], {
      opacity: 0,
      duration: 0.8,
    });

    return () => {
      tl.kill();
    };
  }, [theme, strokeColor]);

  return (
    <div className="p-2 rounded-2xl bg-transparent">
      <svg
        width="50"
        height="50"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginTop: "1em" }}
      >
        <g ref={groupRef} fill="none">
          {style2.map((d, i) => (
            <path
              key={i}
              ref={(el) => (pathRefs.current[i] = el)}
              d={d}
              stroke={strokeColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neon-glow)"
            />
          ))}
        </g>
        <defs>
          {/* Neon Glow Filter */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={glowColor}
              floodOpacity="1"
            />
          </filter>

          {/* Gradient for subtle fill pulse */}
          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientStart} stopOpacity="0.6" />
            <stop offset="100%" stopColor={gradientStart} stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default LogoAnimated;
