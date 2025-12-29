import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Calendar, ArrowRight } from 'lucide-react';
import { api, type Project } from '../lib/api';
import { Button3D } from 'react-3d-button';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

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
      await api.createProject(newProjectName);
      setNewProjectName('');
      setIsCreating(false);
      fetchProjects();
    } catch {
      alert('Failed to create project');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Projects</h2>
          <p className="text-gray-400 mt-1">Manage your chatbots and knowledge bases</p>
        </div>
        <Button3D type="primary" onPress={() => setIsCreating(true)}>
          <span className="flex items-center gap-2">
            <Plus size={20} />
            New Project
          </span>
        </Button3D>
      </div>

      {isCreating && (
        <div className="mb-8 card-base p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="label-base mb-1">
                Project Name
              </label>
              <input
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
                className="w-full input-base"
                autoFocus
              />
            </div>
            <Button3D type="primary" onPress={handleCreateProject}>
              Create
            </Button3D>
            <Button3D type="secondary" onPress={() => setIsCreating(false)}>
              Cancel
            </Button3D>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12 card-base border-dashed">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="text-gray-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-100">No projects yet</h3>
          <p className="text-gray-400 mt-1 mb-4">Create your first project to get started</p>
          <div className="mt-2">
            <Button3D type="primary" onPress={() => setIsCreating(true)}>
              Create Project
            </Button3D>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="block group card-base p-6 hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Folder size={20} />
                </div>
                <ArrowRight className="text-gray-600 group-hover:text-blue-500 transition-colors" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{project.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar size={16} />
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
