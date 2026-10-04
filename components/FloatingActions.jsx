"use client";

import { useState } from "react";
import InstallPrompt from "@/components/InstallPrompt";
import WhatsAppFab from "@/components/WhatsAppFab";

export default function FloatingActions() {
  const [installPromptVisible, setInstallPromptVisible] = useState(false);

  return (
    <>
      <InstallPrompt onVisibilityChange={setInstallPromptVisible} />
      <WhatsAppFab
        positionClassName={installPromptVisible ? "bottom-36 sm:bottom-6" : "bottom-6"}
      />
    </>
  );
}
