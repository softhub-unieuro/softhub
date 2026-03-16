import React from 'react';

export const DetalheLog = ({ log }) => {
  return (
    <div className="p-4 bg-muted/50">
      <h4 className="font-bold mb-2">Detalhes do Log</h4>
      <pre className="text-xs">{JSON.stringify(log, null, 2)}</pre>
    </div>
  );
};

export default DetalheLog;
