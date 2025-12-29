import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Calendar, Code, Copy, Check, Eye, Trash2 } from 'lucide-react';
import { api, type Project } from '../lib/api';
import { Button3D } from 'react-3d-button';
import { Input } from '../components/ui/Input';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [embedFormat, setEmbedFormat] = useState<'html' | 'react' | 'next' | 'vue'>('html');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [justCreated, setJustCreated] = useState<Project | null>(null);
  const WIDGET_DEV_URL = (import.meta.env.VITE_WIDGET_DEV_URL as string | undefined) ?? 'http://localhost:8081';

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const created = await api.createProject(newProjectName);
      setJustCreated(created);
      setNewProjectName('');
      setIsCreating(false);
      fetchProjects();
    } catch {
      alert('Failed to create project');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete project "${name}"?\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      if (justCreated?.id === id) {
        setJustCreated(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const snippet = useMemo(() => {
    const pid = justCreated?.id ?? 'PROJECT_ID';
    const widgetUrl = 'https://cdn.embedai.dev/widget.js';
    switch (embedFormat) {
      case 'react':
        return `import { useEffect } from 'react';

export const ConversoWidget = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "${widgetUrl}";
    script.dataset.projectId = "${pid}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
};`;
      case 'next':
        return `import Script from 'next/script';

export const ConversoWidget = () => (
  <Script
    src="${widgetUrl}"
    data-project-id="${pid}"
    strategy="lazyOnload"
  />
);`;
      case 'vue':
        return `<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  const script = document.createElement('script');
  script.src = "${widgetUrl}";
  script.dataset.projectId = "${pid}";
  script.async = true;
  document.body.appendChild(script);
});
</script>`;
      case 'html':
      default:
        return `<script src="${widgetUrl}" data-project-id="${pid}"></script>`;
    }
  }, [justCreated, embedFormat]);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const livePreview = () => {
    if (!justCreated) return;
    const base = new URL(WIDGET_DEV_URL);
    const params = new URLSearchParams();
    params.set('projectId', justCreated.id);
    params.set('apiKey', justCreated.api_key);
    const url = `${base.origin}${base.pathname}?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="animate-pulse">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Projects</h2>
          <p className="text-gray-400 mt-2">Manage your chatbots and knowledge bases</p>
        </div>
        {!isCreating && (
          <Button3D type="primary" onPress={() => setIsCreating(true)}>
            <span className="flex items-center gap-2">
              <Plus size={18} />
              New Project
            </span>
          </Button3D>
        )}
      </div>

      {isCreating && (
        <div className="mb-8 card-base p-6 shadow-lg animate-in fade-in slide-in-from-top-4 border-blue-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Project</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Project Name
              </label>
              <Input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
                placeholder="e.g. Customer Support Bot"
                autoFocus
              />
            </div>
            <Button3D type="primary" onPress={handleCreateProject} disabled={!newProjectName.trim()}>
              Create Project
            </Button3D>
            <Button3D type="secondary" onPress={() => setIsCreating(false)}>
              Cancel
            </Button3D>
          </div>
        </div>
      )}

      {justCreated && (
        <div className="mb-8 card-base p-6 border-green-500/20 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code size={20} className="text-green-400" />
              Embed Code for <span className="text-green-400">{justCreated.name}</span>
            </h3>
            <Button3D type="secondary" onPress={() => setJustCreated(null)}>
              Dismiss
            </Button3D>
          </div>
          
          <div className="flex gap-1 border-b border-gray-800 mb-0">
            {(['html', 'react', 'next', 'vue'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setEmbedFormat(fmt)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  embedFormat === fmt
                    ? 'bg-gray-800 text-white border-t border-x border-gray-700'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                }`}
              >
                {fmt === 'html' ? 'HTML' : fmt === 'react' ? 'React' : fmt === 'next' ? 'Next.js' : 'Vue'}
              </button>
            ))}
          </div>
          
          <div className="bg-gray-950/80 p-4 rounded-b-lg border border-gray-800 border-t-0 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300">{snippet}</pre>
          </div>
          
          <div className="mt-4 flex gap-3 justify-end">
            <Button3D type="primary" onPress={copySnippet}>
              <span className="flex items-center gap-2">
                {copiedSnippet ? <Check size={16} /> : <Copy size={16} />}
                {copiedSnippet ? 'Copied' : 'Copy Code'}
              </span>
            </Button3D>
            <Button3D type="secondary" onPress={livePreview}>
              <span className="flex items-center gap-2">
                <Eye size={16} />
                Live Preview
              </span>
            </Button3D>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 card-base border-dashed border-gray-800 bg-gray-900/20">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
            <Folder className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-medium text-white">No projects yet</h3>
          <p className="text-gray-400 mt-2 mb-6 max-w-sm mx-auto">Create your first project to start building your AI chatbot.</p>
          <Button3D type="primary" onPress={() => setIsCreating(true)}>
            <span className="flex items-center gap-2">
              <Plus size={18} />
              Create Project
            </span>
          </Button3D>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="block group card-base p-6 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                  title="Delete Project"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-300 border border-blue-500/20 group-hover:border-transparent">
                  <Folder size={24} />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 pr-8 truncate group-hover:text-blue-400 transition-colors">
                {project.name}
              </h3>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-4 pt-4 border-t border-gray-800/50">
                <Calendar size={14} />
                <span>{new Date(project.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
