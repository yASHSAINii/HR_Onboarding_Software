import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import TemplateEditor from '../components/TemplateEditor';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  const openCreateModal = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSave = () => {
    closeModal();
    loadTemplates();
  };

  return (
    <section className="block">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">Email Templates</h2>
        <div className="flex gap-3">
          <button
            className="bg-[#4F46E5] text-white border-none py-3 px-6 rounded-[12px] font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 hover:bg-[#4338CA] hover:-translate-y-0.5"
            onClick={openCreateModal}
          >
            Create New Template
          </button>
        </div>
      </div>

      {/* Templates list card */}
      <div className="bg-white rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] mt-[15px]">
        <ul className="list-none p-0 m-0">
          {templates.map((t) => (
            <li key={t.id} className="my-0 py-4 px-6 border-b border-[#E5E7EB] last:border-0">
              <div>
                <strong className="text-[#1F2937]">{replacePlaceholdersWithSample(t.name)}</strong>
                <span className="text-[#6B7280] mx-2">–</span>
                <span className="text-[#6B7280]">{replacePlaceholdersWithSample(t.subject)}</span>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => openEditModal(t)}
                  className="bg-[#4F46E5] text-white border-none py-2 px-4 rounded-md cursor-pointer hover:bg-[#4338CA] transition-colors mr-3"
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
          {templates.length === 0 && (
            <li className="py-4 px-6 text-center text-[#6B7280]">No templates found. Create one.</li>
          )}
        </ul>
      </div>

      {/* Modal for Template Editor */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[12px] w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <span
                className="text-3xl cursor-pointer text-[#6B7280] hover:text-[#1F2937] leading-none"
                onClick={closeModal}
              >
                &times;
              </span>
            </div>
            <div className="p-6">
              <TemplateEditor
                template={editingTemplate}
                onSave={handleSave}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Templates;