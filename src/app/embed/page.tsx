import { ChatWidget } from "@/components/widget/chat-widget";

// Dedicated route for the embeddable widget. Loaded inside an <iframe> by
// public/widget.js on the client's own site (see that file for the loader
// script) -- this page must render nothing but the widget itself, with a
// transparent background, so only the bubble/panel are visible over the
// host page rather than a solid rectangle.
export default function EmbedPage() {
  return (
    <>
      <style>{`
        html, body { background: transparent !important; }
      `}</style>
      <ChatWidget />
    </>
  );
}
