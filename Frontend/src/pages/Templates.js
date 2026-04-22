import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import TemplateEditor from '../components/TemplateEditor';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/recruiter/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/recruiter/templates/${id}`);
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template');
    }
  };

  // Helper for preview (replaces placeholders with sample values)
  const replacePlaceholdersWithSample = (text) => {
    if (!text) return '';
    const sampleData = {
      '{{first_name}}': 'John',
      '{{last_name}}': 'Doe',
      '{{email}}': 'john.doe@example.com',
      '{{employee_id}}': '1234',
      '{{app_name}}': 'DayZero',
    };
    let result = text;
    for (const [placeholder, value] of Object.entries(sampleData)) {
      const escaped = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), value);
    }
    return result;
  };

  return (
    <section id="templates" className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-dark">Email Templates</h2>
        <div className="flex gap-3">
          <button
            className="bg-primary text-white border-none py-3 px-6 rounded-12px font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-0.5"
            onClick={() => setEditingTemplate({})}
          >
            Create New Template
          </button>
        </div>
      </div>

      <div className="bg-white rounded-12px shadow-custom mt-[15px]">
        <ul className="list-none p-0">
          {templates.map((t) => (
            <li key={t.id} className="my-2.5 py-2.5 px-4 border-b border-gray-200">
              <strong>{replacePlaceholdersWithSample(t.name)}</strong> – {replacePlaceholdersWithSample(t.subject)}
              <div className="mt-2.5">
                <button
                  onClick={() => setEditingTemplate(t)}
                  className="bg-primary text-white border-none py-2 px-4 rounded-md cursor-pointer hover:bg-indigo-700 transition-colors mr-2.5"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="bg-red-600 text-white border-none py-2 px-4 rounded-md cursor-pointer hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {templates.length === 0 && <li className="my-2.5 py-2.5 px-4">No templates found. Create one.</li>}
        </ul>
      </div>

      <div className="bg-white rounded-12px shadow-custom mt-[15px]">
        {editingTemplate && (
          <TemplateEditor
            template={editingTemplate}
            onSave={() => {
              setEditingTemplate(null);
              loadTemplates();
            }}
            onCancel={() => setEditingTemplate(null)}
          />
        )}
      </div>
    </section>
  );
};

export default Templates;