interface IconProps {
  className?: string;
}

function IconBase({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function LogInIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </IconBase>
  );
}

export function LogOutIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </IconBase>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </IconBase>
  );
}

export function StopIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect height="12" rx="2" width="12" x="6" y="6" />
    </IconBase>
  );
}

export function RotateCwIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </IconBase>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconBase>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m20 6-11 11-5-5" />
    </IconBase>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </IconBase>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </IconBase>
  );
}
