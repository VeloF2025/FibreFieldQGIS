export default function TestPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-blue-600">TEST PAGE WORKING</h1>
      <p className="text-lg mt-4">If you see this, Next.js routing is working fine.</p>
      <div className="mt-8 space-y-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Test Import Button
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-4">
          Test Create Button
        </button>
      </div>
    </div>
  );
}