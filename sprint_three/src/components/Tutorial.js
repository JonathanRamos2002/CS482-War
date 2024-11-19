import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import './Tutorial.css';

const WarTutorial = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to Cosmic War",
      content: "Embark on an intergalactic card battle where you'll wage war across the cosmos! Learn the basics in this quick tutorial.",
      image: "/api/placeholder/400/200"
    },
    {
      title: "Game Setup",
      content: "The deck is divided equally between two players. Each player gets 26 cards, face down. You can't look at your cards until they're played!",
      image: "/api/placeholder/400/200"
    },
    {
      title: "Basic Play",
      content: "Each turn, both players flip their top card face up. The player with the higher card wins and takes both cards, putting them at the bottom of their deck.",
      image: "/api/placeholder/400/200"
    },
    {
      title: "War Time!",
      content: "When players tie, it's WAR! Each player places 3 cards face down and one card face up. Highest face-up card wins all cards played!",
      image: "/api/placeholder/400/200"
    },
    {
      title: "Victory",
      content: "The game ends when one player collects all 52 cards. They become the Cosmic Champion!",
      image: "/api/placeholder/400/200"
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <div className="tutorial-header">
          <h2 className="tutorial-title">{tutorialSteps[currentStep].title}</h2>
          <button
            onClick={onClose}
            className="tutorial-close-button"
          >
            <X size={24} />
          </button>
        </div>
        <div className="tutorial-content-wrapper">
          <div className="tutorial-main-content">
            <div className="tutorial-image-container">
              <img
                src={tutorialSteps[currentStep].image}
                alt={tutorialSteps[currentStep].title}
                className="tutorial-image"
              />
            </div>
            <p className="tutorial-text">
              {tutorialSteps[currentStep].content}
            </p>
            <div className="tutorial-navigation">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="tutorial-nav-button"
              >
                <ChevronLeft size={20} />
                <span>Previous</span>
              </button>
              <div className="tutorial-progress">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`tutorial-progress-dot ${
                      index === currentStep ? 'active' : ''
                    }`}
                  />
                ))}
              </div>
              {currentStep < tutorialSteps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="tutorial-nav-button"
                >
                  <span>Next</span>
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="tutorial-finish-button"
                >
                  Start Playing
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarTutorial;