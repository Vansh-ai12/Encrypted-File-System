export const EmptyOrg = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 select-none">

     
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg">
        <span className="text-white text-4xl font-bold">📌</span>
      </div>

   
      <h2 className="text-2xl font-semibold text-gray-900 mt-6">
        Welcome to OdoBoard 👋
      </h2>

    
      <p className="text-gray-500 text-sm mt-2 max-w-sm">
        Create your first organisation and unlock powerful collaboration.
      </p>


      <button
  onClick={() => window.dispatchEvent(new Event("open-create-org-modal"))}
  className="mt-5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 
             text-white text-sm font-medium px-6 py-2.5 rounded-lg shadow-md 
             transition-all duration-200 hover:cursor-pointer"
>
   Create Organisation
</button>

    </div>
  );
};
