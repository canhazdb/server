import React, { useState, useEffect } from 'react';

function App() {
  const [collection, setCollection] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [queryResult, setQueryResult] = useState(null);

  const [insertCollection, setInsertCollection] = useState('');
  const [insertData, setInsertData] = useState('');
  const [insertResult, setInsertResult] = useState(null);

  const [updateCollection, setUpdateCollection] = useState('');
  const [updateDocumentId, setUpdateDocumentId] = useState('');
  const [updateData, setUpdateData] = useState('');
  const [updateResult, setUpdateResult] = useState(null);

  const [deleteCollection, setDeleteCollection] = useState('');
  const [deleteDocumentId, setDeleteDocumentId] = useState('');
  const [deleteResult, setDeleteResult] = useState(null);

  const [collections, setCollections] = useState([]);
  const [documentIds, setDocumentIds] = useState([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/_haz.collections');
      const data = await response.json();
      setCollections(data.map(c => c.name));
    } catch (error) {
      console.error('Error fetching collections:', error);
      setCollections([]);
    }
  };

  const fetchDocumentIds = async (collectionName) => {
    try {
      const response = await fetch(`/api/${collectionName}`);
      const data = await response.json();
      const ids = data.map(doc => doc.id);
      setDocumentIds(ids);
    } catch (error) {
      console.error('Error fetching document IDs:', error);
      setDocumentIds([]);
    }
  };

  const queryDatabase = async () => {
    try {
      const url = `/api/${collection}${documentId ? `/${documentId}` : ''}`;
      const response = await fetch(url);
      setQueryResult(await response.json());
    } catch (error) {
      setQueryResult({ error: error.message });
    }
  };

  const insertRecord = async () => {
    try {
      const response = await fetch(`/api/${insertCollection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: insertData
      });
      setInsertResult(await response.json());
    } catch (error) {
      setInsertResult({ error: error.message });
    }
  };

  const updateRecord = async () => {
    try {
      const response = await fetch(`/api/${updateCollection}/${updateDocumentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: updateData
      });
      setUpdateResult(await response.json());
    } catch (error) {
      setUpdateResult({ error: error.message });
    }
  };

  const deleteRecord = async () => {
    try {
      const response = await fetch(`/api/${deleteCollection}/${deleteDocumentId}`, {
        method: 'DELETE'
      });
      setDeleteResult(await response.json());
    } catch (error) {
      setDeleteResult({ error: error.message });
    }
  };

  const handleCollectionChange = (setter) => (e) => {
    const selectedCollection = e.target.value;
    setter(selectedCollection);
    if (selectedCollection) {
      fetchDocumentIds(selectedCollection);
    } else {
      setDocumentIds([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">CanhazDB GUI</h1>

        <div className="space-y-8">
          <Section title="Query Database">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Select
                value={collection}
                onChange={handleCollectionChange(setCollection)}
                options={collections}
                placeholder="Collection"
              />
              <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="Document ID (optional)" />
              <Button onClick={queryDatabase} color="blue">Query</Button>
            </div>
            <ResultDisplay result={queryResult} />
          </Section>

          <Section title="Insert Record">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Select
                value={insertCollection}
                onChange={handleCollectionChange(setInsertCollection)}
                options={collections}
                placeholder="Collection"
              />
              <div className="col-span-2">
                <Button onClick={insertRecord} color="green">Insert</Button>
              </div>
            </div>
            <Textarea
              value={insertData}
              onChange={(e) => setInsertData(e.target.value)}
              placeholder="JSON Data"
              className="mb-4"
            />
            <ResultDisplay result={insertResult} />
          </Section>

          <Section title="Update Record">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Select
                value={updateCollection}
                onChange={handleCollectionChange(setUpdateCollection)}
                options={collections}
                placeholder="Collection"
              />
              <Select
                value={updateDocumentId}
                onChange={(e) => setUpdateDocumentId(e.target.value)}
                options={documentIds}
                placeholder="Document ID"
              />
              <Button onClick={updateRecord} color="yellow">Update</Button>
            </div>
            <Textarea value={updateData} onChange={(e) => setUpdateData(e.target.value)} placeholder="JSON Data" className="mb-4" />
            <ResultDisplay result={updateResult} />
          </Section>

          <Section title="Delete Record">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Select
                value={deleteCollection}
                onChange={handleCollectionChange(setDeleteCollection)}
                options={collections}
                placeholder="Collection"
              />
              <Select
                value={deleteDocumentId}
                onChange={(e) => setDeleteDocumentId(e.target.value)}
                options={documentIds}
                placeholder="Document ID"
              />
              <Button onClick={deleteRecord} color="red">Delete</Button>
            </div>
            <ResultDisplay result={deleteResult} />
          </Section>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, children } : { title: string; children: ReactNode; }) => (
  <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
    <h2 className="text-2xl font-semibold mb-4 text-blue-300">{title}</h2>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input {...props} className="bg-gray-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
);

const Textarea = ({ className, ...props }) => (
  <textarea
    {...props}
    className={`bg-gray-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full h-32 resize-none ${className}`}
  />
);

const Select = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={onChange}
    className="bg-gray-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
  >
    <option value="" disabled>{placeholder}</option>
    {options.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
);

const Button = ({ children, color, ...props }) => {
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    red: 'bg-red-500 hover:bg-red-600',
  };

  return (
    <button
      {...props}
      className={`${colorClasses[color]} text-white px-6 py-2 rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-${color}-500 w-full`}
    >
      {children}
    </button>
  );
};

const ResultDisplay = ({ result }) => (
  result && (
    <pre className="bg-gray-700 p-4 rounded-md shadow overflow-x-auto">
      <code className="text-sm text-gray-300">
        {JSON.stringify(result, null, 2)}
      </code>
    </pre>
  )
);

export default App;