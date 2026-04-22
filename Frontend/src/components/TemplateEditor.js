import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import api from '../api/axios'; // our configured axios instance

const TemplateEditor = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: body,
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && body !== editor.getHTML()) {
      editor.commands.setContent(body);
    }
  }, [body, editor]);

  const replacePlaceholdersWithSample = (text) => {
    const sampleData = {
      '{{first_name}}': 'John',
      '{{last_name}}': 'Doe',
      '{{email}}': 'john.doe@example.com',
      '{{employee_id}}': '12345',
      '{{app_name}}': 'DayZero',
    };
    let result = text;
    for (const [placeholder, value] of Object.entries(sampleData)) {
      const escaped = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), value);
    }
    return result;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Body is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = { name, subject, body };
      if (template?.id) {
        await api.put(`/recruiter/templates/${template.id}`, data);
      } else {
        await api.post('/recruiter/templates', data);
      }
      onSave();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save template';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 mt-5">
      <h2 className="text-xl font-bold mb-4">{template?.id ? 'Edit Template' : 'New Template'}</h2>
      {error && <div className="text-red-600 mb-2.5">{error}</div>}
      <div className="mb-3.5">
        <label className="block mb-1 font-medium text-sm">Template Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border border-gray-light rounded-lg focus:outline-none focus:border-primary"
        />
      </div>
      <div className="mb-3.5">
        <label className="block mb-1 font-medium text-sm">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full p-2 border border-gray-light rounded-lg focus:outline-none focus:border-primary"
        />
      </div>
      <div className="mb-3.5">
        <label className="block mb-1 font-medium text-sm">Body</label>
        <div className="border border-gray-400 p-2.5 min-h-[100px] rounded-md shadow-custom">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="mb-3.5">
        <span className="font-medium">Preview</span>
        <div
          className="mt-1 border border-gray-400 p-2.5 min-h-[100px] rounded-md shadow-custom"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(replacePlaceholdersWithSample(body)) }}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="mr-2.5 bg-primary text-white border-none py-2.5 px-5 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={onCancel}
        className="mr-2.5 bg-primary text-white border-none py-2.5 px-5 rounded-md cursor-pointer hover:bg-indigo-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default TemplateEditor;