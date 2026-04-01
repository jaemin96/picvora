import { Camera, Aperture, Timer, Gauge, Focus, Smartphone } from "lucide-react";
import type { ExifData } from "@/types";

function formatExposure(val?: number): string | null {
  if (!val) return null;
  if (val >= 1) return `${val}s`;
  const denom = Math.round(1 / val);
  return `1/${denom}s`;
}

function formatFocalLength(val?: number): string | null {
  if (!val) return null;
  return `${val}mm`;
}

function formatFNumber(val?: number): string | null {
  if (!val) return null;
  return `f/${val}`;
}

type StatBadgeProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function StatBadge({ icon, label, value }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

export function CameraInfoSection({ exif }: { exif: ExifData | null }) {
  if (!exif) return null;

  const cameraName = [exif.make, exif.model].filter(Boolean).join(" ");
  const aperture = formatFNumber(exif.fNumber);
  const shutter = formatExposure(exif.exposureTime);
  const iso = exif.iso ? `${exif.iso}` : null;
  const focal = formatFocalLength(exif.focalLength);

  const software = exif.software?.trim() || null;
  const hasDevice = !!cameraName || !!exif.lensModel || !!software;
  const hasSettings = aperture || shutter || iso || focal;

  if (!hasDevice && !hasSettings) return null;

  return (
    <div className="space-y-3">
      {/* Row 1: 장치 + 앱 */}
      {hasDevice && (
        <div className="flex flex-wrap gap-2">
          {cameraName && (
            <div className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2">
              <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground">{cameraName}</span>
            </div>
          )}
          {software && (
            <div className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-primary">{software}</span>
            </div>
          )}
          {exif.lensModel && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2">
              <Focus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{exif.lensModel}</span>
            </div>
          )}
        </div>
      )}

      {/* Row 2: 설정값 */}
      {hasSettings && (
        <div className="flex flex-wrap gap-2">
          {aperture && (
            <StatBadge
              icon={<Aperture className="h-3.5 w-3.5" />}
              label="조리개"
              value={aperture}
            />
          )}
          {shutter && (
            <StatBadge
              icon={<Timer className="h-3.5 w-3.5" />}
              label="셔터속도"
              value={shutter}
            />
          )}
          {iso && (
            <StatBadge
              icon={<Gauge className="h-3.5 w-3.5" />}
              label="ISO"
              value={iso}
            />
          )}
          {focal && (
            <StatBadge
              icon={<Focus className="h-3.5 w-3.5" />}
              label="초점거리"
              value={focal}
            />
          )}
        </div>
      )}
    </div>
  );
}
