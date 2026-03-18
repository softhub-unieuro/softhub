import React from 'react';

export const LinhaLog = ({ log, expandido, aoAlternar }) => {
  return (
    <tr onClick={() => aoAlternar(log.id)} className="cursor-pointer hover:bg-muted/5">
      <td className="px-5 py-3 text-sm">{log.timestamp}</td>
      <td className="px-3 py-3 text-sm">{log.action}</td>
      <td className="px-3 py-3 text-sm">{log.author}</td>
      <td className="px-3 py-3 text-sm">{log.description}</td>
      <td className="px-5 py-3 text-sm">{log.module}</td>
    </tr>
  );
};

export default LinhaLog;
