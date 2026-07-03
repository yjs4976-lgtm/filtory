import Image from "next/image"

type LogoMarkProps = {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <Image
      src="/images/logo.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  )
}
