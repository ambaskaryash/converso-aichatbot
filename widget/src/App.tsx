import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatWindow } from './components/ChatWindow';

interface AppProps {
  projectId: string;
}

function App({ projectId }: AppProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen ? (
        <div className="w-[380px] h-[600px] transition-all duration-300 ease-in-out">
          <ChatWindow projectId={projectId} onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </>
  );
}

export default App;
