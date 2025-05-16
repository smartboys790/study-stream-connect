
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  completedDates: Date[];
  createdAt: Date;
};

const DEMO_HABITS: Habit[] = [
  {
    id: '1',
    name: 'Study WebRTC',
    description: 'Learn about peer connections and data channels',
    frequency: 'daily',
    completedDates: [
      new Date(Date.now() - 86400000 * 1),
      new Date(Date.now() - 86400000 * 2),
      new Date(Date.now() - 86400000 * 3),
    ],
    createdAt: new Date(Date.now() - 86400000 * 10),
  },
  {
    id: '2',
    name: 'Practice coding a video chat app',
    frequency: 'daily',
    completedDates: [
      new Date(Date.now() - 86400000 * 1),
    ],
    createdAt: new Date(Date.now() - 86400000 * 7),
  },
  {
    id: '3',
    name: 'Review Socket.io documentation',
    frequency: 'weekly',
    completedDates: [
      new Date(Date.now() - 86400000 * 7),
    ],
    createdAt: new Date(Date.now() - 86400000 * 14),
  },
];

const HabitTracker = () => {
  const [habits, setHabits] = useState<Habit[]>(DEMO_HABITS);
  const [date] = useState<Date>(new Date());

  const toggleHabitCompletion = (habitId: string) => {
    setHabits(currentHabits => 
      currentHabits.map(habit => {
        if (habit.id === habitId) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const isCompleted = habit.completedDates.some(date => {
            const completedDate = new Date(date);
            completedDate.setHours(0, 0, 0, 0);
            return completedDate.getTime() === today.getTime();
          });
          
          if (isCompleted) {
            // Remove today from completedDates
            return {
              ...habit,
              completedDates: habit.completedDates.filter(date => {
                const completedDate = new Date(date);
                completedDate.setHours(0, 0, 0, 0);
                return completedDate.getTime() !== today.getTime();
              })
            };
          } else {
            // Add today to completedDates
            return {
              ...habit,
              completedDates: [...habit.completedDates, today]
            };
          }
        }
        return habit;
      })
    );
  };

  const isHabitCompletedToday = (habit: Habit): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return habit.completedDates.some(date => {
      const completedDate = new Date(date);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    });
  };

  const calculateCompletion = (): number => {
    const dailyHabits = habits.filter(h => h.frequency === 'daily');
    if (dailyHabits.length === 0) return 0;
    
    const completedToday = dailyHabits.filter(isHabitCompletedToday).length;
    return (completedToday / dailyHabits.length) * 100;
  };

  const completionPercentage = calculateCompletion();

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Study Habits</h2>
          <div className="text-sm text-muted-foreground">
            {format(date, 'PPP')}
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Daily Progress</CardTitle>
            <CardDescription>
              {Math.round(completionPercentage)}% of daily habits completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={completionPercentage} className="h-2" />
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Today's Tasks</h3>
          {habits.map(habit => (
            <div 
              key={habit.id} 
              className="flex items-center space-x-4 p-4 rounded-lg border"
            >
              <Checkbox 
                id={`habit-${habit.id}`} 
                checked={isHabitCompletedToday(habit)}
                onCheckedChange={() => toggleHabitCompletion(habit.id)}
              />
              <div className="flex-1">
                <label 
                  htmlFor={`habit-${habit.id}`} 
                  className="text-base font-medium cursor-pointer"
                >
                  {habit.name}
                </label>
                {habit.description && (
                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                )}
              </div>
              <div className="text-xs bg-muted px-2 py-1 rounded">
                {habit.frequency}
              </div>
            </div>
          ))}
        </div>
        
        <Calendar 
          mode="single"
          selected={date}
          className="rounded-md border"
        />
      </div>
    </div>
  );
};

export default HabitTracker;
