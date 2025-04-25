/* global p5 */
import React, { useEffect, useRef } from "react";

function AudioVisualizer() {
  const canvasRef = useRef(null);
  const p5InstanceRef = useRef(null);

  useEffect(() => {
    if (p5InstanceRef.current) return;

    const sketch = (p) => {
      let mic, fft, picapau;
      let rings = [];
      let frameCounter = 0;

      const bandHues = {
        bass: 0,      // Carmim
        lowMid: 15,   // Coral
        mid: 30,      // Tangerina
        highMid: 45   // Dourado
      };

      const weights = {
        bass: 1.9,
        lowMid: 1.4,
        mid: 1,
        highMid: 1
      };

      p.preload = () => {
        picapau = p.loadImage("picapau.png");
      };

      p.setup = () => {
        const canvas = p.createCanvas(600, 400);
        canvas.parent(canvasRef.current);
        mic = new p5.AudioIn();
        fft = new p5.FFT(0.9, 64);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.getAudioContext().suspend();
      };

      p.draw = () => {
        p.background(0, 10);
        fft.analyze();

        const bands = {
          bass: fft.getEnergy("bass"),
          lowMid: fft.getEnergy("lowMid"),
          mid: fft.getEnergy("mid"),
          highMid: fft.getEnergy("highMid")
        };

        const weightedBands = Object.fromEntries(
          Object.entries(bands).map(([band, value]) => [band, value * weights[band]])
        );

        const dominantBand = Object.keys(weightedBands).reduce((a, b) =>
          weightedBands[a] > weightedBands[b] ? a : b
        );

        const energy = bands[dominantBand];

        if (energy > 30 && frameCounter % 10 === 0) {
          const hue = bandHues[dominantBand];
          rings.push({
            x: p.width / 2,
            y: p.height / 2,
            radius: 30,
            growth: p.map(energy, 30, 255, 2, 12),
            hue
          });
        }

        frameCounter++;

        // fundo psicodélico
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          p.fill(r.hue, 100, 100, 10);
          p.stroke(0, 0, 0, 80);
          p.strokeWeight(8);
          p.ellipse(r.x, r.y, r.radius * 2);
          r.radius += r.growth;
          if (r.radius > Math.max(p.width, p.height)) rings.splice(i, 1);
        }

        // imagem do Pica-Pau
        const centerX = p.width / 2;
        const centerY = p.height / 2;
        p.imageMode(p.CENTER);
        p.image(picapau, centerX, centerY, picapau.width * 1.5, picapau.height * 1.5);
      };

      p.mousePressed = () => {
        const context = p.getAudioContext();
        if (context.state !== "running") {
          context.resume().then(() => {
            mic.start(() => {
              fft.setInput(mic);
              console.log("Áudio ativado (FFT OK)");
            });
          });
        }
      };
    };

    p5InstanceRef.current = new p5(sketch);

    return () => {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    };
  }, []);

  return <div ref={canvasRef}></div>;
}

export default AudioVisualizer;
