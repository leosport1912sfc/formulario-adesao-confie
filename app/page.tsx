"use client";

import { useState } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, CheckCircle, AlertCircle, Wallet, User, Home as HomeIcon } from "lucide-react";

// --- SEU LINK DO SHEETMONKEY ---
const SHEETMONKEY_URL = "https://api.sheetmonkey.io/form/kVuUbupnucvKq4Lkvm9Tex"; 

// --- FUNÇÕES DE MÁSCARA (FORMATAÇÃO) ---
const formatarCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formatarTelefone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const formatarCEP = (value: string) => {
  return value
    .replace(/\D/g, "") // Remove tudo que não é número
    .replace(/(\d{5})(\d)/, "$1-$2") // Coloca o traço depois do 5º número
    .replace(/(-\d{3})\d+?$/, "$1"); // Limita o tamanho
};

// --- VALIDAÇÕES ---
const schema = z.object({
  // RESPONSÁVEL
  nome: z.string().min(3, "Nome obrigatório"),
  cpf: z.string().min(14, "CPF incompleto"),
  nascimento: z.string().min(1, "Data obrigatória"),
  profissao: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().min(14, "Telefone inválido"),
  seguro_ap_titular: z.boolean().default(false),

  // ENDEREÇO
  endereco_rua: z.string().min(1, "Endereço obrigatório"),
  endereco_bairro: z.string().min(1, "Bairro obrigatório"),
  endereco_referencia: z.string().optional(),
  endereco_cidade: z.string().min(1, "Cidade obrigatória"),
  // CEP agora exige 9 caracteres (12345-678)
  endereco_cep: z.string().min(9, "CEP incompleto"),

  // DEPENDENTES
  dependentes: z.array(z.object({
    nome: z.string().min(2, "Nome obrigatório"),
    nascimento: z.string().min(1, "Data obrigatória"),
    cpf: z.string().optional(),
    parentesco: z.string().min(1, "Selecione o parentesco"),
    seguro: z.boolean().default(false),
  })).refine((items) => {
    return items.every((item) => {
      if (!item.seguro) return true;
      if (!item.nascimento) return false;
      const dataNasc = new Date(item.nascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - dataNasc.getFullYear();
      const m = hoje.getMonth() - dataNasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) idade--;
      if (idade < 18 || idade > 70) return false;
      return true;
    });
  }, {
    message: "ATENÇÃO: Para Seguro de Vida, o dependente deve ter entre 18 e 70 anos.",
    path: ["root"]
  }),

  // FINANCEIRO
  mensalidade_valor: z.string().min(1, "Obrigatório"),
  total_primeira_mensalidade: z.string().optional(),
  seguro_ap_valor: z.string().optional(),
  vencimento_primeira: z.string().min(1, "Obrigatório"),
  forma_pagamento_1: z.string().min(1, "Obrigatório"),
  dia_vencimento_demais: z.string().min(1, "Obrigatório"),
  forma_pagamento_demais: z.string().min(1, "Obrigatório"),
  aceite: z.boolean().refine(val => val === true, { message: "Aceite obrigatório" }),
});

type FormSchemaType = z.infer<typeof schema>;

export default function Home() {
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      dependentes: [],
      aceite: false,
      seguro_ap_titular: false,
      email: "",
      profissao: "",
      endereco_referencia: "",
      total_primeira_mensalidade: "",
      seguro_ap_valor: ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "dependentes"
  });

  const onSubmit: SubmitHandler<FormSchemaType> = async (data) => {
    setEnviando(true);
    try {
      const dadosBase = { ...data };
      // @ts-ignore
      delete dadosBase.dependentes; 

      const dadosDependentes: Record<string, string> = {};
      
      data.dependentes.forEach((dep, index) => {
        const num = index + 1;
        dadosDependentes[`dependente_${num}_nome`] = dep.nome;
        dadosDependentes[`dependente_${num}_nascimento`] = dep.nascimento;
        dadosDependentes[`dependente_${num}_parentesco`] = dep.parentesco;
        dadosDependentes[`dependente_${num}_seguro`] = dep.seguro ? "SIM" : "NÃO";
      });

      const dadosFinais = { 
        ...dadosBase, 
        ...dadosDependentes,
        data_envio: new Date().toLocaleString("pt-BR") 
      };

      await fetch(SHEETMONKEY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosFinais),
      });

      setSucesso(true);
      window.scrollTo(0, 0);
    } catch (error) {
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md border-t-4 border-blue-900">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-blue-900 mb-2">Proposta Enviada!</h1>
          <p className="text-gray-600">Seus dados foram recebidos pela Confie Assistência.</p>
          <button onClick={() => window.location.reload()} className="mt-6 text-blue-600 hover:underline font-bold">Nova Proposta</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-6 px-3 md:px-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-300">
        
        {/* CABEÇALHO */}
        <div className="bg-white pt-8 px-8 pb-0 flex flex-col gap-0">
          
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pb-3">
            
            {/* LOGO REPRODUZIDO (Com ajustes de responsividade no SVG) */}
            <div className="flex items-end gap-0 select-none">
                
                {/* Ajuste Responsivo: 
                   O ícone agora usa w-12 h-12 no mobile e cresce para w-[60px] no desktop 
                   para manter a proporção com o texto que também cresce.
                */}
                <div className="text-red-600 -mr-1 mb-5 relative z-10">
                    <svg className="w-12 h-12 md:w-[60px] md:h-[60px] transform -rotate-6" viewBox="0 0 450 575" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M482.3 99.6c-13.3-7.3-30.2-2.4-37.5 10.9L184.7 397.4l-129.6-114c-12.2-10.8-30.8-9.5-41.6 2.7s-9.5 30.8 2.7 41.6l155.7 137c5.8 5.1 13.3 7.8 20.9 7.5 7.6-.3 14.9-3.7 20-9.4l280-323c7.3-13.3 2.4-30.2-10.9-37.5z" stroke="currentColor" strokeWidth="20" />
                    </svg>
                </div>
                
                {/* Texto do Logo */}
                <div className="flex flex-col leading-none z-0">
                    <span 
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        className="text-blue-900 text-5xl md:text-[4.5rem] tracking-tighter"
                    >
                        CONFIE
                    </span>
                    <span className="font-sans text-blue-900 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase self-end">
                        ASSISTÊNCIA
                    </span>
                </div>
            </div>
            
            {/* TÍTULO À DIREITA */}
            {/* Adicionado break-words para segurança em telas muito pequenas, embora whitespace-nowrap seja o desejado */}
            <h2 className="font-sans text-2xl md:text-4xl font-bold text-blue-900 uppercase tracking-wide leading-none whitespace-nowrap mb-1">
              Proposta de Adesão
            </h2>
          </div>
          
          {/* LINHA DECORATIVA BICOLOR */}
          <div className="w-full h-1.5 flex">
            <div className="w-2/5 bg-red-600"></div>
            <div className="w-3/5 bg-blue-900"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-8 space-y-8">
          
          {/* SEÇÃO 1: RESPONSÁVEL FINANCEIRO */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-blue-900 text-white p-3 flex items-center gap-2">
              <User size={20} />
              <h3 className="font-bold uppercase text-sm md:text-base">Responsável Financeiro</h3>
            </div>
            
            <div className="p-4 grid gap-4 bg-slate-50">
              <div className="bg-white p-3 rounded border border-blue-100 flex items-center gap-3">
                 <input type="checkbox" {...register("seguro_ap_titular")} className="w-5 h-5 text-blue-900 rounded" />
                 <span className="text-blue-900 font-bold text-sm">Contratar Seguro AP</span>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-bold text-blue-900 uppercase">Nome Completo</label>
                  <input {...register("nome")} className="w-full p-2 border border-slate-300 rounded focus:border-blue-900 outline-none" />
                  {errors.nome && <span className="text-red-600 text-xs font-bold">{errors.nome.message as string}</span>}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  
                  {/* CPF */}
                  <div>
                    <label className="text-xs font-bold text-blue-900 uppercase">CPF</label>
                    <input 
                      {...register("cpf")} 
                      placeholder="000.000.000-00" 
                      maxLength={14}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-900 outline-none"
                      onChange={(e) => {
                        e.target.value = formatarCPF(e.target.value);
                        register("cpf").onChange(e);
                      }}
                    />
                    {errors.cpf && <span className="text-red-600 text-xs font-bold">{errors.cpf.message as string}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-blue-900 uppercase">Data Nascimento</label>
                    <input {...register("nascimento")} type="date" className="w-full p-2 border border-slate-300 rounded focus:border-blue-900 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-900 uppercase">Profissão</label>
                    <input {...register("profissao")} className="w-full p-2 border border-slate-300 rounded focus:border-blue-900 outline-none" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-blue-900 uppercase">E-mail</label>
                    <input {...register("email")} type="email" className="w-full p-2 border border-slate-300 rounded focus:border-blue-900 outline-none" />
                  </div>
                  
                  {/* TELEFONE */}
                  <div>
                    <label className="text-xs font-bold text-blue-900 uppercase">Telefone / WhatsApp</label>
                    <input 
                      {...register("telefone")} 
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-900 outline-none" 
                      onChange={(e) => {
                        e.target.value = formatarTelefone(e.target.value);
                        register("telefone").onChange(e);
                      }}
                    />
                    {errors.telefone && <span className="text-red-600 text-xs font-bold">{errors.telefone.message as string}</span>}
                  </div>
                </div>
              </div>

              {/* ENDEREÇO INTEGRADO */}
              <div className="mt-4 border-t border-slate-200 pt-4">
                 <div className="flex items-center gap-2 mb-3 text-blue-900">
                    <HomeIcon size={18} />
                    <span className="font-bold text-sm uppercase">Endereço Residencial</span>
                 </div>
                 <div className="grid gap-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        
                        {/* CEP COM MÁSCARA */}
                        <div className="md:col-span-1">
                            <label className="text-xs font-bold text-blue-900 uppercase">CEP</label>
                            <input 
                              {...register("endereco_cep")} 
                              placeholder="00000-000"
                              maxLength={9}
                              className="w-full p-2 border border-slate-300 rounded"
                              onChange={(e) => {
                                e.target.value = formatarCEP(e.target.value);
                                register("endereco_cep").onChange(e);
                              }}
                            />
                             {errors.endereco_cep && <span className="text-red-600 text-xs font-bold">{errors.endereco_cep.message as string}</span>}
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-xs font-bold text-blue-900 uppercase">Endereço (Rua, Av...)</label>
                            <input {...register("endereco_rua")} className="w-full p-2 border border-slate-300 rounded" />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-blue-900 uppercase">Bairro</label>
                            <input {...register("endereco_bairro")} className="w-full p-2 border border-slate-300 rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-900 uppercase">Cidade</label>
                            <input {...register("endereco_cidade")} className="w-full p-2 border border-slate-300 rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-900 uppercase">Referência</label>
                            <input {...register("endereco_referencia")} className="w-full p-2 border border-slate-300 rounded" />
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: DEPENDENTES */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-blue-900 text-white p-3 flex justify-between items-center">
              <h3 className="font-bold uppercase text-sm md:text-base">Dependentes</h3>
              <button 
                type="button" 
                onClick={() => append({ nome: "", nascimento: "", parentesco: "", seguro: false })}
                className="flex items-center gap-1 bg-white text-blue-900 px-3 py-1 rounded text-xs font-bold hover:bg-slate-100 transition"
              >
                <Plus size={14} /> ADICIONAR
              </button>
            </div>

            {errors.dependentes?.root && (
              <div className="bg-red-50 text-red-700 p-3 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {errors.dependentes.root.message}
              </div>
            )}

            <div className="bg-slate-50 p-4 space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative">
                  <div className="grid gap-3">
                    <div className="flex justify-between">
                         <span className="text-xs font-bold text-blue-900 uppercase">Nome Dependente {index + 1}</span>
                         <button type="button" onClick={() => remove(index)} aria-label="Remover dependente" className="text-red-500 hover:text-red-700">
                           <Trash2 size={16} />
                         </button>
                    </div>
                    <input {...register(`dependentes.${index}.nome` as const)} className="w-full p-2 border border-slate-300 rounded text-sm" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Nascimento</label>
                        <input {...register(`dependentes.${index}.nascimento` as const)} type="date" className="w-full p-2 border border-slate-300 rounded text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Parentesco</label>
                        <select {...register(`dependentes.${index}.parentesco` as const)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                            <option value="">...</option>
                            <option value="Conjuge">Cônjuge</option>
                            <option value="Filho">Filho(a)</option>
                            <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex items-end">
                        <label className="flex items-center gap-2 p-2 border border-blue-100 bg-blue-50 rounded w-full cursor-pointer">
                          <input type="checkbox" {...register(`dependentes.${index}.seguro` as const)} className="w-4 h-4 text-blue-900" />
                          <span className="text-xs font-bold text-blue-900">Seguro AP? (18-70 anos)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {fields.length === 0 && <p className="text-center text-gray-400 text-sm italic">Nenhum dependente inserido.</p>}
            </div>
          </section>

          {/* SEÇÃO 3: FINANCEIRO */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-blue-900 text-white p-3 flex items-center gap-2">
              <Wallet size={20} />
              <h3 className="font-bold uppercase text-sm md:text-base">Dados Financeiros</h3>
            </div>
            <div className="p-4 bg-slate-50 grid gap-4">
                
                {/* Linha 1: Valores */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-blue-900 uppercase">Valor Mensalidade (R$)</label>
                        <input {...register("mensalidade_valor")} type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded" />
                        {errors.mensalidade_valor && <span className="text-red-600 text-xs font-bold">{errors.mensalidade_valor.message as string}</span>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-blue-900 uppercase">Valor Seguro AP (R$)</label>
                        <input {...register("seguro_ap_valor")} type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-blue-900 uppercase">Total 1ª Mensalidade (R$)</label>
                        <input {...register("total_primeira_mensalidade")} type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded font-bold text-blue-900" />
                    </div>
                </div>

                {/* Linha 2: Pagamento 1ª Mensalidade */}
                <div className="bg-white p-3 border border-slate-200 rounded">
                    <p className="text-xs font-bold text-blue-900 uppercase mb-2 border-b pb-1">1ª Mensalidade</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Data de Vencimento</label>
                            <input {...register("vencimento_primeira")} type="date" className="w-full p-2 border border-slate-300 rounded" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Forma de Pagamento</label>
                            <select {...register("forma_pagamento_1")} className="w-full p-2 border border-slate-300 rounded bg-white">
                                <option value="">Selecione...</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Pix">Pix / Transferência</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Linha 3: Demais Mensalidades */}
                <div className="bg-white p-3 border border-slate-200 rounded">
                    <p className="text-xs font-bold text-blue-900 uppercase mb-2 border-b pb-1">Demais Mensalidades</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Dia de Vencimento (1-30)</label>
                            <input {...register("dia_vencimento_demais")} type="number" min="1" max="30" placeholder="Ex: 10" className="w-full p-2 border border-slate-300 rounded" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Forma de Pagamento</label>
                            <select {...register("forma_pagamento_demais")} className="w-full p-2 border border-slate-300 rounded bg-white">
                                <option value="">Selecione...</option>
                                <option value="Carne">Carnê</option>
                                <option value="Boleto">Boleto</option>
                                <option value="CartaoRecorrente">Cartão Recorrente (Link)</option>
                                <option value="Convenio">Convênio</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>
          </section>

          {/* RODAPÉ E ACEITE */}
          <div className="border-t-2 border-blue-900 pt-6">
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition">
              <input type="checkbox" {...register("aceite")} className="mt-1 w-5 h-5 text-blue-900 rounded focus:ring-blue-900" />
              <span className="text-sm text-blue-900 font-medium leading-relaxed">
                Reconheço a exatidão das informações acima, ficando ciente que esta ficha será anexada ao contrato de adesão.
              </span>
            </label>
            {errors.aceite && <p className="text-red-600 font-bold mt-2 ml-2 text-sm">{errors.aceite.message as string}</p>}
          </div>

          <button 
            type="submit" 
            disabled={enviando}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black py-4 rounded-lg text-lg uppercase tracking-widest shadow-lg transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? "ENVIANDO..." : "FINALIZAR PROPOSTA"}
          </button>
          
          {/* Linha Decorativa Bicolor (Adicional opcional para fechar o design) */}
          <div className="w-full h-1.5 flex">
            <div className="w-2/5 bg-red-600"></div>
            <div className="w-3/5 bg-blue-900"></div>
          </div>

        </form>
        
        {/* Rodapé Confie */}
        <div className="bg-blue-900 text-white text-center py-4 text-xs">
           <p>CONFIE ASSISTÊNCIA • Rua Neri Pinheiro, nº 338 - Cidade Nova - RJ</p>
           <p className="opacity-70 mt-1">Ambiente Seguro</p>
        </div>
      </div>
    </main>
  );
}