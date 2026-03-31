import Image from "next/image";

export function ThemedLogo({ width = 140, height = 42 }: { width?: number; height?: number }) {
  return (
    <>
      <Image src="/picvora-logo-dark.svg" alt="Picvora" width={width} height={height} className="hidden dark:block" priority unoptimized />
      <Image src="/picvora-logo-light.svg" alt="Picvora" width={width} height={height} className="block dark:hidden" priority unoptimized />
    </>
  );
}
