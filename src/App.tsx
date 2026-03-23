import React, { useState, useRef } from 'react';
import { FileText, FileImage, Loader2, Copy, CheckCircle2, Download, AlertTriangle, ShieldAlert, Calculator, Trash2, ArrowLeft, Briefcase, Search, FileEdit, Camera } from 'lucide-react';
import { fillContract, AppMode, ClientDataType, ClientData } from './services/gemini';
import { FileUpload } from './components/FileUpload';

export default function App() {
  const [appMode, setAppMode] = useState<'menu' | AppMode>('menu');
  const [contractFile, setContractFile] = useState<File | null>(null);
  
  // Client Data
  const [clientDataType, setClientDataType] = useState<ClientDataType>('passport');
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [companyCardFile, setCompanyCardFile] = useState<File | null>(null);
  const [innValue, setInnValue] = useState<string>('');
  
  // Financial inputs
  const [totalAmount, setTotalAmount] = useState<number>(250000);
  const [installmentMonths, setInstallmentMonths] = useState<number>(10);
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [firstPayment, setFirstPayment] = useState<number>(25000);
  const [secondPayment, setSecondPayment] = useState<number>(25000);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'contract' | 'risks'>('contract');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Custom Logo
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(localStorage.getItem('customLogo'));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCustomLogo(base64String);
        localStorage.setItem('customLogo', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setContractFile(null);
    setPassportFile(null);
    setCompanyCardFile(null);
    setInnValue('');
    setClientDataType('passport');
    setTotalAmount(250000);
    setInstallmentMonths(10);
    setFirstPaymentDate(new Date().toISOString().split('T')[0]);
    setFirstPayment(25000);
    setSecondPayment(25000);
    setResult(null);
    setRisks([]);
    setActiveTab(appMode === 'проверка' ? 'risks' : 'contract');
    setError(null);
  };

  const handleProcess = async () => {
    if (!contractFile) return;
    
    let clientData: ClientData | null = null;
    
    if (appMode !== 'проверка') {
      if (clientDataType === 'passport' && !passportFile) return;
      if (clientDataType === 'companyCard' && !companyCardFile) return;
      if (clientDataType === 'inn' && !innValue.trim()) return;
      
      clientData = {
        type: clientDataType,
        file: clientDataType === 'passport' ? passportFile : (clientDataType === 'companyCard' ? companyCardFile : null),
        inn: clientDataType === 'inn' ? innValue : undefined
      };
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setRisks([]);

    try {
      const financialData = {
        totalAmount,
        installmentMonths,
        firstPaymentDate,
        firstPayment,
        secondPayment
      };

      const { html, risks: foundRisks } = await fillContract(contractFile, clientData, financialData, appMode as AppMode);
      // Clean up markdown code blocks if the model still outputs them
      let filledContract = html.replace(/^```html\n?/, '').replace(/\n?```$/, '');
      setResult(filledContract);
      setRisks(foundRisks);
      
      if (appMode === 'проверка' || (foundRisks && foundRisks.length > 0)) {
        setActiveTab('risks');
      } else {
        setActiveTab('contract');
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while processing the documents.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadWord = () => {
    if (!result) return;
    
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Filled Contract</title>
          <style>
            body { font-family: "Times New Roman", serif; font-size: 12pt; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 5px; }
          </style>
        </head>
        <body>
          ${result}
        </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', fullHtml], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Filled_Contract.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (appMode === 'menu') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center space-y-4">
            <div 
              className="inline-block mb-4 relative group cursor-pointer"
              onClick={() => logoInputRef.current?.click()}
              title="Нажмите, чтобы загрузить свой логотип"
            >
              <input 
                type="file" 
                ref={logoInputRef} 
                onChange={handleLogoChange} 
                accept="image/*" 
                className="hidden" 
              />
              <img 
                src={customLogo || "/logo.jpg"} 
                alt="AS Logo" 
                className="w-32 h-32 rounded-full shadow-2xl border-2 border-neutral-800 object-cover group-hover:opacity-50 transition-opacity"
                onError={(e) => {
                  if (e.currentTarget.src !== 'https://placehold.co/128x128/171717/4f46e5?text=AS') {
                    e.currentTarget.src = 'https://placehold.co/128x128/171717/4f46e5?text=AS';
                  }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera size={24} className="text-white mb-1" />
                <span className="text-white text-xs font-medium px-2 py-1 bg-black/60 rounded-md">Изменить</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Assistant designet by Stepanishin</h1>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">Выберите режим работы для автоматизации заполнения и проверки договоров.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => { setAppMode('работа'); setActiveTab('contract'); }}
              className="bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-800 hover:border-indigo-400 hover:shadow-md transition-all text-left group flex flex-col h-full"
            >
              <div className="bg-indigo-500/10 text-indigo-400 p-4 rounded-2xl inline-block mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <Briefcase size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Работа</h2>
              <p className="text-neutral-400 flex-1">Полный цикл: заполнение по паспорту, расчет финансовых условий, генерация номера и проверка рисков.</p>
            </button>

            <button
              onClick={() => { setAppMode('проверка'); setActiveTab('risks'); }}
              className="bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-800 hover:border-rose-400 hover:shadow-md transition-all text-left group flex flex-col h-full"
            >
              <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl inline-block mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Search size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Проверка</h2>
              <p className="text-neutral-400 flex-1">Только анализ рисков. Поиск кабальных и невыгодных условий в предоставленном договоре.</p>
            </button>

            <button
              onClick={() => { setAppMode('заполнение'); setActiveTab('contract'); }}
              className="bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-800 hover:border-emerald-400 hover:shadow-md transition-all text-left group flex flex-col h-full"
            >
              <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl inline-block mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <FileEdit size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Заполнение</h2>
              <p className="text-neutral-400 flex-1">Заполнение данных по паспорту и проверка рисков. Без финансовых расчетов и генерации номера.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProcessDisabled = appMode === 'проверка' 
    ? (!contractFile || isProcessing)
    : (!contractFile || isProcessing || 
        (clientDataType === 'passport' && !passportFile) ||
        (clientDataType === 'companyCard' && !companyCardFile) ||
        (clientDataType === 'inn' && !innValue.trim())
      );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => { handleClear(); setAppMode('menu'); }}
              className="text-neutral-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-neutral-800"
              title="Назад в меню"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center space-x-3 border-l border-neutral-800 pl-4">
              <div className="flex items-center justify-center">
                <img 
                  src={customLogo || "/logo.jpg"} 
                  alt="AS Logo" 
                  className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== 'https://placehold.co/32x32/171717/4f46e5?text=AS') {
                      e.currentTarget.src = 'https://placehold.co/32x32/171717/4f46e5?text=AS';
                    }
                  }}
                />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">
                Assistant designet by Stepanishin
                <span className="text-neutral-600 font-normal mx-2">|</span>
                <span className="text-neutral-400 font-normal">
                  {appMode === 'работа' && 'Режим: Работа'}
                  {appMode === 'проверка' && 'Режим: Проверка'}
                  {appMode === 'заполнение' && 'Режим: Заполнение'}
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
              <h2 className="text-lg font-medium mb-4 text-white">1. Upload Blank Contract</h2>
              <FileUpload
                label="Upload Contract (PDF, Image, Text, Word)"
                accept="application/pdf,image/*,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                file={contractFile}
                onFileSelect={setContractFile}
                icon={FileText}
              />
            </div>

            {appMode !== 'проверка' && (
              <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
                <h2 className="text-lg font-medium mb-4 text-white">2. Данные клиента</h2>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={clientDataType === 'passport'} 
                      onChange={() => setClientDataType('passport')} 
                      className="text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-neutral-950 border-neutral-700" 
                    />
                    <span className="text-sm font-medium text-neutral-300">Паспорт</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={clientDataType === 'companyCard'} 
                      onChange={() => setClientDataType('companyCard')} 
                      className="text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-neutral-950 border-neutral-700" 
                    />
                    <span className="text-sm font-medium text-neutral-300">Карточка предприятия</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={clientDataType === 'inn'} 
                      onChange={() => setClientDataType('inn')} 
                      className="text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-neutral-950 border-neutral-700" 
                    />
                    <span className="text-sm font-medium text-neutral-300">По ИНН</span>
                  </label>
                </div>

                {clientDataType === 'passport' && (
                  <FileUpload
                    label="Загрузить паспорт (Фото/Скан)"
                    accept="image/*,application/pdf"
                    file={passportFile}
                    onFileSelect={setPassportFile}
                    icon={FileImage}
                  />
                )}
                
                {clientDataType === 'companyCard' && (
                  <FileUpload
                    label="Загрузить карточку предприятия (PDF, Word, Фото)"
                    accept="application/pdf,image/*,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    file={companyCardFile}
                    onFileSelect={setCompanyCardFile}
                    icon={FileText}
                  />
                )}
                
                {clientDataType === 'inn' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Введите ИНН организации</label>
                    <input 
                      type="text" 
                      value={innValue} 
                      onChange={e => setInnValue(e.target.value)} 
                      placeholder="Например: 7707083893"
                      className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                )}
              </div>
            )}

            {appMode === 'работа' && (
              <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
                <h2 className="text-lg font-medium mb-4 flex items-center text-white">
                  <Calculator size={20} className="mr-2 text-indigo-400" />
                  3. Financial Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Сумма по договору (руб.)</label>
                    <input 
                      type="number" 
                      value={totalAmount} 
                      onChange={e => setTotalAmount(Number(e.target.value))} 
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Рассрочка (мес.)</label>
                    <input 
                      type="number" 
                      value={installmentMonths} 
                      onChange={e => setInstallmentMonths(Number(e.target.value))} 
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Дата 1-го платежа</label>
                    <input 
                      type="date" 
                      value={firstPaymentDate} 
                      onChange={e => setFirstPaymentDate(e.target.value)} 
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Первоначальный взнос (руб.)</label>
                    <input 
                      type="number" 
                      value={firstPayment} 
                      onChange={e => setFirstPayment(Number(e.target.value))} 
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Второй платеж (руб.)</label>
                    <input 
                      type="number" 
                      value={secondPayment} 
                      onChange={e => setSecondPayment(Number(e.target.value))} 
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleProcess}
                disabled={isProcessDisabled}
                className={`flex-1 py-4 px-6 rounded-xl font-medium text-white flex items-center justify-center transition-all ${
                  isProcessDisabled
                    ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed'
                    : 'bg-indigo-500 hover:bg-indigo-600 shadow-md hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processing & Analyzing...
                  </>
                ) : (
                  appMode === 'проверка' ? 'Analyze Risks Only' : 'Generate & Analyze Contract'
                )}
              </button>

              <button
                onClick={handleClear}
                disabled={isProcessing}
                className={`py-4 px-6 rounded-xl font-medium flex items-center justify-center transition-all border ${
                  isProcessing
                    ? 'bg-neutral-950 text-neutral-600 border-neutral-800 cursor-not-allowed'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-red-400 hover:border-red-900 shadow-sm active:scale-[0.98]'
                }`}
                title="Clear all data"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-950/50 text-red-400 rounded-xl border border-red-900 text-sm">
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800 flex flex-col h-[600px] lg:h-auto">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-4">
              <div className="flex space-x-4">
                {appMode !== 'проверка' && (
                  <button
                    onClick={() => setActiveTab('contract')}
                    className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'contract' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
                  >
                    <div className="flex items-center"><FileText size={16} className="mr-2"/> Filled Contract</div>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('risks')}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'risks' ? 'border-red-400 text-red-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
                >
                  <div className="flex items-center">
                    <ShieldAlert size={16} className="mr-2"/>
                    Risk Analysis
                    {risks.length > 0 && (
                      <span className="ml-2 bg-red-900/50 text-red-400 py-0.5 px-2 rounded-full text-xs">{risks.length}</span>
                    )}
                  </div>
                </button>
              </div>
              
              {activeTab === 'contract' && result && appMode !== 'проверка' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center text-sm font-medium text-neutral-400 hover:text-indigo-400 transition-colors px-2 py-1 rounded-md hover:bg-neutral-800"
                  >
                    {copied ? (
                      <><CheckCircle2 size={16} className="mr-1 text-green-400" /> Copied!</>
                    ) : (
                      <><Copy size={16} className="mr-1" /> Copy</>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    className="flex items-center text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-3 py-1.5 rounded-md shadow-sm"
                  >
                    <Download size={16} className="mr-1" /> Download Word Doc
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-neutral-950 rounded-xl border border-neutral-800 p-6 overflow-y-auto">
              {isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-sm">Extracting details and analyzing risks...</p>
                </div>
              ) : activeTab === 'contract' && appMode !== 'проверка' ? (
                result ? (
                  <div 
                    className="prose prose-sm prose-invert max-w-none text-neutral-300"
                    dangerouslySetInnerHTML={{ __html: result }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-center">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Your filled contract will appear here.</p>
                  </div>
                )
              ) : (
                risks.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-red-400 flex items-center">
                      <AlertTriangle className="mr-2 text-red-500" size={20}/>
                      Unfavorable Conditions Found
                    </h3>
                    <ul className="space-y-3">
                      {risks.map((risk, idx) => (
                        <li key={idx} className="bg-red-950/30 border border-red-900/50 p-4 rounded-lg text-red-300 text-sm flex items-start">
                          <span className="bg-red-900/50 text-red-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">{idx + 1}</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : result || (appMode === 'проверка' && result !== null) ? (
                  <div className="h-full flex flex-col items-center justify-center text-green-500 text-center">
                    <CheckCircle2 size={48} className="mb-4 opacity-50" />
                    <p className="text-sm font-medium">No major risks or draconian conditions identified.</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-center">
                    <ShieldAlert size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Upload and process a contract to see the risk analysis.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
