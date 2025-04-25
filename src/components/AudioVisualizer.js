/* global p5 */
import React, { useEffect, useRef, useState } from "react";

function AudioVisualizer() {
  const canvasRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [songInfo, setSongInfo] = useState("Detectando música...");
  const easedWaveformRef = useRef([]);

  useEffect(() => {
    if (p5InstanceRef.current) return;

    const sketch = (p) => {
      let mic, fft;

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(canvasRef.current);
        mic = new p5.AudioIn();
        fft = new p5.FFT(0.9, 256);
        fft.setInput(mic);
        mic.start();

        detectMusicACR();

        p.strokeWeight(2);
        p.stroke(255, 255, 255, 180);
        p.noFill();
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };

      p.draw = () => {
        p.background(0);

        const waveform = fft.waveform();
        const easedWaveform = easedWaveformRef.current;

        for (let i = 0; i < waveform.length; i++) {
          const boosted = p.constrain(waveform[i] * 2.5, -1, 1); // 🔊 boost de volume
          if (typeof easedWaveform[i] === "undefined") {
            easedWaveform[i] = boosted;
          } else {
            easedWaveform[i] = p.lerp(easedWaveform[i], boosted, 0.35); // resposta fluida
          }
        }

        p.beginShape();
        p.curveVertex(0, p.height / 2);
        for (let i = 0; i < easedWaveform.length; i += 4) {
          const amplitude = easedWaveform[i] * 5;
          const y = p.map(amplitude, -1, 1, -p.height / 2, p.height / 2);
          const x = p.map(i, 0, easedWaveform.length - 1, 0, p.width);
          p.curveVertex(x, y + p.height / 2);
        }
        p.curveVertex(p.width, p.height / 2);
        p.endShape();
      };
    };

    p5InstanceRef.current = new p5(sketch);

    return () => {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    };
  }, []);

  const detectMusicACR = async () => {
    const host = "identify-us-west-2.acrcloud.com";
    const accessKey = "86579070dec568b47caf33b5e682869f";
    const accessSecret = "VwEWt67IHjSf5TB2G5rnFRnxycv3EIbLPsBS2YzG";
    const httpMethod = "POST";
    const httpUri = "/v1/identify";
    const dataType = "audio";
    const signatureVersion = "1";
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      mediaRecorder.stop();
      await new Promise((resolve) => (mediaRecorder.onstop = resolve));

      const blob = new Blob(chunks, { type: "audio/wav" });

      const stringToSign = [
        httpMethod,
        httpUri,
        accessKey,
        dataType,
        signatureVersion,
        timestamp,
      ].join("\n");

      const encoder = new TextEncoder();
      const keyData = encoder.encode(accessSecret);
      const algo = { name: "HMAC", hash: "SHA-1" };
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, algo, false, ["sign"]);
      const sig = await crypto.subtle.sign(algo.name, cryptoKey, encoder.encode(stringToSign));
      const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

      const formData = new FormData();
      formData.append("access_key", accessKey);
      formData.append("sample", blob);
      formData.append("sample_bytes", blob.size);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("data_type", dataType);
      formData.append("signature_version", signatureVersion);

      const response = await fetch(`https://${host}${httpUri}`, {
        method: "POST",
        body: formData,
      });

      const json = await response.json();
      if (json.status.code === 0) {
        const { title, artists } = json.metadata.music[0];
        setSongInfo(`${title} – ${artists[0].name}`);
      } else {
        setSongInfo("Música não identificada");
      }

      if (p5InstanceRef.current) {
        const p = p5InstanceRef.current;
        if (p.getAudioContext().state !== "running") {
          await p.getAudioContext().resume();
          console.log("Contexto de áudio reativado após detecção");
        }
      }
    } catch (err) {
      console.error("Erro ao detectar música:", err);
      setSongInfo("Erro ao detectar música");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div ref={canvasRef} />
      <div
        style={{
          position: "absolute",
          bottom: 64,
          width: "100%",
          textAlign: "center",
          color: "#fff",
          fontFamily: "sans-serif",
          fontSize: 18,
          opacity: 0.8,
          pointerEvents: "none",
        }}
      >
        {songInfo}
      </div>
    </div>
  );
}

export default AudioVisualizer;
