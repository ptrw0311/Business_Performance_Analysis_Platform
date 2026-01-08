import { useState } from 'react';

function CompanySelector({ companies, selectedCompany, onCompanyChange, isLoading }) {
  return (
    <div className="company-selector-bar">
      <label style={{ fontWeight: 'bold', color: '#1565c0' }}>🏢 選擇分析公司：</label>
      <select
        id="companySelector"
        className="comp-select"
        value={selectedCompany}
        onChange={(e) => onCompanyChange(e.target.value)}
        disabled={isLoading}
      >
        {isLoading ? (
          <option value="">載入中...</option>
        ) : companies.length === 0 ? (
          <option value="">無資料</option>
        ) : (
          companies.map((company) => (
            <option key={company.id || company.name} value={company.name}>
              {company.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

export default CompanySelector;
