import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetails } from './pages/ProjectDetails';
import { Overview } from './pages/Overview';
import { Embed } from './pages/Embed';
import { Login } from './pages/Login';
import { Conversations } from './pages/Conversations';
import { Admins } from './pages/Admins';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="project/:id" element={<ProjectDetails />} />
          <Route path="embed" element={<Embed />} />
          <Route path="embed/:id" element={<Embed />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="admins" element={<Admins />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
