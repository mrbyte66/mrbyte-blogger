"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MonitorFace } from "./MonitorFace";

export function Character({ motionEnabled }: { motionEnabled: boolean }) {
  const figure = useRef<HTMLDivElement>(null);
  const [screenReady, setScreenReady] = useState(false);
  return <div className="character-placement" aria-hidden="true">
    <div className="character-motion" ref={figure}>
      <div className="character-breath" style={motionEnabled ? undefined : { animation: "none" }}>
        <Image className="character-image" src="/assets/character.png" alt="" width={1024} height={1536} preload sizes="(max-width: 640px) 110vw, 78vh" quality={90} draggable={false} />
        <div className="original-screen-glass" data-ready={screenReady}>
          <Image className="character-image" src="/assets/character-curly-v2.png" alt="" width={1024} height={1536} sizes="(max-width: 640px) 110vw, 78vh" quality={90} draggable={false} onLoad={() => setScreenReady(true)} />
        </div>
        <MonitorFace motionEnabled={motionEnabled} ready={screenReady} figure={figure} />
      </div>
    </div>
  </div>;
}
