import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WarTutorial from './Tutorial';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-right">ChevronRight</div>,
  ChevronLeft: () => <div data-testid="chevron-left">ChevronLeft</div>,
  X: () => <div data-testid="x-icon">X</div>
}));

// Mock CSS
jest.mock('./Tutorial.css', () => ({}));

describe('WarTutorial Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic Rendering Tests
  describe('Initial Rendering', () => {
    test('renders initial tutorial state correctly', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      // Check first step content
      expect(screen.getByText('Welcome to Cosmic War')).toBeInTheDocument();
      expect(screen.getByText(/Embark on an intergalactic card battle/)).toBeInTheDocument();
      
      // Check navigation elements
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-left')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      
      // Verify initial button states
      expect(screen.getByText('Previous')).toBeDisabled();
      expect(screen.getByText('Next')).toBeEnabled();
    });

    test('renders all progress dots', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      const dots = document.querySelectorAll('.tutorial-progress-dot');
      expect(dots).toHaveLength(5);
      expect(dots[0]).toHaveClass('active');
    });
  });

  // Navigation Tests
  describe('Navigation Functionality', () => {
    test('navigates forward through all steps', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      const nextButton = screen.getByText('Next');

      // Step 1 to 2
      fireEvent.click(nextButton);
      expect(screen.getByText('Game Setup')).toBeInTheDocument();

      // Step 2 to 3
      fireEvent.click(nextButton);
      expect(screen.getByText('Basic Play')).toBeInTheDocument();

      // Step 3 to 4
      fireEvent.click(nextButton);
      expect(screen.getByText('War Time!')).toBeInTheDocument();

      // Step 4 to 5
      fireEvent.click(nextButton);
      expect(screen.getByText('Victory')).toBeInTheDocument();
      expect(screen.getByText('Start Playing')).toBeInTheDocument();
    });

    test('navigates backward through steps', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      // Move forward first
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText('Basic Play')).toBeInTheDocument();

      // Then move backward
      const prevButton = screen.getByText('Previous');
      fireEvent.click(prevButton);
      expect(screen.getByText('Game Setup')).toBeInTheDocument();

      fireEvent.click(prevButton);
      expect(screen.getByText('Welcome to Cosmic War')).toBeInTheDocument();
    });

    test('handles button disabled states correctly', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      // Check initial state
      expect(screen.getByText('Previous')).toBeDisabled();
      expect(screen.getByText('Next')).toBeEnabled();

      // Move to last step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      // Verify finish state
      expect(screen.getByText('Previous')).toBeEnabled();
      expect(screen.getByText('Start Playing')).toBeInTheDocument();
    });
  });

  // Progress Indicator Tests
  describe('Progress Indicator', () => {
    test('updates progress dots correctly', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      const dots = document.querySelectorAll('.tutorial-progress-dot');
      
      // Check initial state
      expect(dots[0]).toHaveClass('active');
      expect(dots[1]).not.toHaveClass('active');

      // Move to next step
      fireEvent.click(screen.getByText('Next'));
      expect(dots[1]).toHaveClass('active');
      expect(dots[0]).not.toHaveClass('active');
    });

    test('maintains correct progress through navigation', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      // Forward navigation
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      
      // Backward navigation
      fireEvent.click(screen.getByText('Previous'));
      
      const dots = document.querySelectorAll('.tutorial-progress-dot');
      expect(dots[1]).toHaveClass('active');
    });
  });

  // Close Functionality Tests
  describe('Close Functionality', () => {
    test('calls onClose when X button is clicked', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      const closeButton = screen.getByTestId('x-icon').parentElement;
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when Start Playing is clicked', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      // Navigate to last step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      // Click Start Playing
      const startButton = screen.getByText('Start Playing');
      fireEvent.click(startButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // Content Verification Tests
  describe('Tutorial Content', () => {
    test('displays correct content for each step', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      const steps = [
        'Welcome to Cosmic War',
        'Game Setup',
        'Basic Play',
        'War Time!',
        'Victory'
      ];

      steps.forEach((step, index) => {
        if (index > 0) {
          fireEvent.click(screen.getByText('Next'));
        }
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });

    test('maintains content integrity through navigation', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      // Forward then back
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Previous'));
      
      expect(screen.getByText('Game Setup')).toBeInTheDocument();
      expect(screen.getByText(/The deck is divided equally/)).toBeInTheDocument();
    });
  });

  // Mobile Responsiveness Tests
  describe('Mobile Responsiveness', () => {
    beforeAll(() => {
      // Mock matchMedia
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));
    });

    test('renders correctly on mobile viewport', () => {
      render(<WarTutorial onClose={mockOnClose} />);
      
      const tutorialCard = document.querySelector('.tutorial-card');
      expect(tutorialCard).toBeInTheDocument();
      
      // Verify mobile-specific elements
      const navigationButtons = document.querySelectorAll('.tutorial-nav-button');
      navigationButtons.forEach(button => {
        expect(button).toHaveStyle({ padding: '0.5rem 1rem' });
      });
    });
  });
});