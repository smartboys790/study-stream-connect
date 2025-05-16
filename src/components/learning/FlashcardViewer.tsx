
import React, { useState, useEffect } from 'react';
import Flashcard, { FlashcardData } from './Flashcard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const DEMO_FLASHCARDS: FlashcardData[] = [
  {
    id: '1',
    front: 'What is WebRTC?',
    back: 'Web Real-Time Communication - a technology that enables direct peer-to-peer communication for video, voice, and data sharing without requiring plugins or native apps.',
    difficulty: 'medium',
  },
  {
    id: '2',
    front: 'What is the purpose of PeerJS?',
    back: 'PeerJS simplifies WebRTC peer-to-peer data, video, and audio connections by providing a complete, configurable, and easy-to-use peer-to-peer API.',
    difficulty: 'easy',
  },
  {
    id: '3',
    front: 'What is Socket.io used for in a WebRTC application?',
    back: 'Socket.io is used for signaling - the process of coordinating communication and exchanging metadata needed to establish the peer-to-peer connection between users.',
    difficulty: 'hard',
  },
  {
    id: '4',
    front: 'What is a UUID?',
    back: 'A Universally Unique Identifier (UUID) is a 128-bit label used to identify information in computer systems. In video chat apps, they often identify unique rooms.',
    difficulty: 'easy',
  },
];

interface FlashcardViewerProps {
  deckId?: string;
}

const FlashcardViewer = ({ deckId }: FlashcardViewerProps) => {
  const [flashcards, setFlashcards] = useState<FlashcardData[]>(DEMO_FLASHCARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  
  // Effect to load flashcards from API or database
  useEffect(() => {
    // In a real app, we would fetch cards based on deckId
    // For demo purposes, we're using the hardcoded cards
  }, [deckId]);

  const handleKnow = (id: string) => {
    setKnownCards(prev => new Set(prev).add(id));
  };

  const handleDontKnow = (id: string) => {
    setUnknownCards(prev => new Set(prev).add(id));
  };

  const handleNextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // End of deck
    }
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  const progress = ((currentIndex) / flashcards.length) * 100;
  
  return (
    <div className="flex flex-col space-y-8 w-full max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">WebRTC Flashcards</h2>
        <div className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {flashcards.length}
        </div>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      {currentIndex < flashcards.length ? (
        <Flashcard
          flashcard={flashcards[currentIndex]}
          onKnow={handleKnow}
          onDontKnow={handleDontKnow}
          onNextCard={handleNextCard}
        />
      ) : (
        <div className="flex flex-col items-center space-y-4 p-8 border rounded-lg">
          <h3 className="text-xl font-medium">Deck Complete!</h3>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{knownCards.size}</div>
              <div className="text-sm text-muted-foreground">Known</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{unknownCards.size}</div>
              <div className="text-sm text-muted-foreground">Unknown</div>
            </div>
          </div>
          <Button onClick={resetDeck}>Restart Deck</Button>
        </div>
      )}
    </div>
  );
};

export default FlashcardViewer;
