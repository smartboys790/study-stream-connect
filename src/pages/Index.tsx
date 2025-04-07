
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Check, Users, Video, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col">
        {/* Hero section */}
        <section className="py-12 md:py-20 px-4 room-gradient">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Virtual Study Rooms for 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-study-600 to-study-800">
                {" Focused Learning"}
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-muted-foreground">
              Connect with other students in real-time, share your screen, and collaborate in our distraction-free study rooms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                className="btn-gradient text-white px-8 py-6 text-lg"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/login")}
                className="px-8 py-6 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>
        
        {/* Features section */}
        <section className="py-16 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
              Everything You Need to Study Better
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Video className="h-10 w-10 text-study-500" />}
                title="Video Rooms"
                description="Connect face-to-face with study partners in distraction-free virtual rooms"
              />
              <FeatureCard 
                icon={<Zap className="h-10 w-10 text-study-500" />}
                title="Screen Sharing"
                description="Share your notes, presentations, or any resource with just one click"
              />
              <FeatureCard 
                icon={<Users className="h-10 w-10 text-study-500" />}
                title="Collaborative Study"
                description="Study more effectively with peer-to-peer learning and support"
              />
            </div>
          </div>
        </section>
        
        {/* How it works */}
        <section className="py-16 px-4 bg-secondary">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
              How StudyStream Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <StepCard
                number={1}
                title="Create an account"
                description="Sign up and create your free StudyStream account in seconds"
              />
              <StepCard
                number={2}
                title="Create or join a room"
                description="Start your own room or join one with a simple room code"
              />
              <StepCard
                number={3}
                title="Start studying together"
                description="Engage in productive study sessions with video, chat and screen sharing"
              />
            </div>
            
            <div className="text-center mt-12">
              <Button 
                onClick={handleGetStarted}
                className="btn-gradient text-white px-8 py-6 text-lg"
              >
                Start Studying Now
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-study-700 text-white rounded-md p-1.5">
              <Video size={20} />
            </div>
            <span className="font-semibold">StudyStream</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} StudyStream. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

interface StepCardProps {
  number: number;
  title: string;
  description: string;
}

const StepCard = ({ number, title, description }: StepCardProps) => {
  return (
    <div className="bg-card rounded-lg p-6 border border-border relative shadow-sm">
      <div className="bg-study-600 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold absolute -top-5">
        {number}
      </div>
      <div className="pt-4">
        <h3 className="text-xl font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        <div className="mt-4 text-study-700">
          <Check size={18} />
        </div>
      </div>
    </div>
  );
};

export default Index;
