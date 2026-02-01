import Linkify from "linkify-react";

interface LinkifyTextProps {
  children: string;
  className?: string;
}

/**
 * Renders text with URLs converted to clickable links.
 * Opens links in new tab with security attributes.
 */
export function LinkifyText({ children, className }: LinkifyTextProps) {
  const linkifyOptions = {
    target: "_blank",
    rel: "noopener noreferrer",
    className: "text-primary underline hover:text-primary/80",
  };

  return (
    <Linkify options={linkifyOptions}>
      <span className={className}>{children}</span>
    </Linkify>
  );
}
