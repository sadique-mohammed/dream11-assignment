"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((module) => module.DotLottieReact),
  { ssr: false },
);

export default function AiPet({ size = 40 }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      <DotLottieReact
        src="/ai%20ai.lottie"
        autoplay
        loop
        renderConfig={{ autoResize: true }}
        style={{ width: "100%", height: "100%" }}
      />
    </span>
  );
}
