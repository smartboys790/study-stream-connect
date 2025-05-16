
import React, { useState } from 'react';
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlashcardViewer from '@/components/learning/FlashcardViewer';
import HabitTracker from '@/components/learning/HabitTracker';

const StudyTools = () => {
  const [activeTab, setActiveTab] = useState('flashcards');
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Study Tools</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="habits">Habit Tracker</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flashcards" className="focus:outline-none">
            <FlashcardViewer />
          </TabsContent>
          
          <TabsContent value="habits" className="focus:outline-none">
            <HabitTracker />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudyTools;
