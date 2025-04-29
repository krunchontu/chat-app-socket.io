import React, { useState, useEffect } from "react";

const PwaInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Check if user has previously dismissed or installed
      const userChoice = localStorage.getItem("pwaInstallChoice");
      
      if (!userChoice) {
        // Show the banner if user hasn't made a choice yet
        setShowBanner(true);
      }
    };
    
    // Add event listener
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    
    // Clean up
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);
  
  // Handle "Add to Home Screen" click
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("No deferred prompt available");
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    // Log the outcome
    console.log("User installation choice:", choiceResult.outcome);
    
    // Store the choice in localStorage
    localStorage.setItem("pwaInstallChoice", choiceResult.outcome);
    
    // Hide the banner regardless of choice
    setShowBanner(false);
    
    // Clear the saved prompt as it can only be used once
    setDeferredPrompt(null);
  };
  
  // Handle "No Thanks" or "X" click
  const handleDismissClick = () => {
    // Store the dismissal in localStorage so we don't show again
    localStorage.setItem("pwaInstallChoice", "dismissed");
    
    // Hide the banner
    setShowBanner(false);
  };
  
  // Don't render anything if the banner shouldn't show
  if (!showBanner) {
    return null;
  }
  
  return (
    <div className="pwa-install-banner fade-in">
      <div>
        <strong>Install Chat App</strong>
        <p>Install this application on your device for a better experience</p>
      </div>
      <div>
        <button onClick={handleInstallClick}>Install</button>
        <button className="close-btn" onClick={handleDismissClick} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
