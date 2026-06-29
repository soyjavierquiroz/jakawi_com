import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { validateSellerVoiceAudioInput } from "@/lib/audio/audio-validation";

export type OptimizedSellerVoiceAudio = {
  buffer: Buffer;
  mimeType: "audio/mpeg";
  size: number;
  durationSeconds: number;
  optimized: true;
  originalMimeType: string;
  originalSize: number;
};

function runBinary(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, { maxBuffer: 1024 * 1024 * 4, timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function probeDurationSeconds(filePath: string) {
  const { stdout } = await runBinary("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("No pudimos leer la duración del audio.");
  return duration;
}

export async function optimizeSellerVoiceAudio(file: File): Promise<OptimizedSellerVoiceAudio> {
  const validation = validateSellerVoiceAudioInput(file);
  const tempDir = await mkdtemp(path.join(tmpdir(), "jakawi-seller-voice-"));
  const inputPath = path.join(tempDir, `input.${validation.extension}`);
  const outputPath = path.join(tempDir, "output.mp3");

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await runBinary("ffmpeg", [
      "-hide_banner",
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "24000",
      "-b:a",
      "48k",
      "-t",
      "15",
      "-map_metadata",
      "-1",
      outputPath,
    ]);

    const duration = await probeDurationSeconds(outputPath);
    if (duration < 1) throw new Error("El audio es demasiado corto.");

    const buffer = await readFile(outputPath);
    return {
      buffer,
      mimeType: "audio/mpeg",
      size: buffer.byteLength,
      durationSeconds: Math.min(15, Math.max(1, Math.round(duration))),
      optimized: true,
      originalMimeType: validation.originalMimeType,
      originalSize: validation.originalSize,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "El audio es demasiado corto.") throw error;
    if (error instanceof Error && error.message.startsWith("Solo se permiten")) throw error;
    if (error instanceof Error && error.message.includes("8MB")) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("No se pudo optimizar el audio en este servidor.");
    }
    throw new Error("No pudimos procesar ese audio. Sube un archivo de audio válido.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
