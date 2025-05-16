
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

export type FlashcardData = {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  nextReview?: string;
};

interface FlashcardProps {
  flashcard: FlashcardData;
  onKnow: (id: string) => void;
  onDontKnow: (id: string) => void;
  onNextCard: () => void;
}

const Flashcard = ({ flashcard, onKnow, onDontKnow, onNextCard }: FlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleFlip = () => {
    if (!answered) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleKnow = () => {
    setAnswered(true);
    onKnow(flashcard.id);
    setTimeout(() => {
      setIsFlipped(false);
      setAnswered(false);
      onNextCard();
    }, 1000);
  };

  const handleDontKnow = () => {
    setAnswered(true);
    onDontKnow(flashcard.id);
    setTimeout(() => {
      setIsFlipped(false);
      setAnswered(false);
      onNextCard();
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative w-full h-64 cursor-pointer perspective-1000 transition-transform duration-500 ${
          answered ? 'pointer-events-none' : ''
        }`}
        onClick={handleFlip}
      >
        <Card
          className={`absolute w-full h-full backface-hidden transition-all duration-500 transform ${
            isFlipped ? 'rotate-y-180 invisible' : ''
          } flex items-center justify-center p-6 text-center`}
        >
          <div className="text-xl font-medium">{flashcard.front}</div>
        </Card>
        <Card
          className={`absolute w-full h-full backface-hidden transition-all duration-500 transform ${
            isFlipped ? '' : 'rotate-y-180 invisible'
          } flex items-center justify-center p-6 text-center bg-muted/20`}
        >
          <div className="text-xl">{flashcard.back}</div>
        </Card>
      </div>
      
      <div className="mt-6 flex justify-center space-x-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={handleDontKnow}
          disabled={!isFlipped || answered}
        >
          <X className="w-4 h-4" /> Don't Know
        </Button>
        <Button 
          className="flex items-center gap-2" 
          onClick={handleKnow}
          disabled={!isFlipped || answered}
        >
          <Check className="w-4 h-4" /> Know
        </Button>
      </div>
    </div>
  );
};

export default Flashcard;
