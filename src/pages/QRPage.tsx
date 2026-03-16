import { QRCodeSVG } from "qrcode.react";

export default function QRPage() {
  const siteUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-aws-dark flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-aws-orange mb-2">
        AWS Architecture Challenge
      </h1>
      <p className="text-gray-400 text-sm mb-8 text-center max-w-xs">
        Scan the QR code below to join the challenge on your device.
      </p>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <QRCodeSVG
          value={siteUrl}
          size={256}
          level="M"
          bgColor="#ffffff"
          fgColor="#232F3E"
        />
      </div>

      <p className="text-gray-500 text-xs mt-6 font-mono break-all text-center max-w-xs select-all">
        {siteUrl}
      </p>

      <a
        href="/"
        className="mt-8 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back
      </a>
    </div>
  );
}
