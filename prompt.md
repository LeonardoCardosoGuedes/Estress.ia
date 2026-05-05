# Prompt para Codex — Desenvolvimento do Stressia

Você é um desenvolvedor fullstack experiente. Desenvolva uma aplicação web chamada **Stressia**, uma plataforma de apoio à saúde mental acadêmica que monitora sinais de fadiga, estresse e desequilíbrio na rotina de estudantes.

## Objetivo do sistema

O Stressia deve ir além de um simples monitoramento de hábitos. A aplicação deve coletar dados do estudante, analisar padrões relacionados a:

- Tempo de exposição a telas;
- Qualidade do descanso;
- Rotina acadêmica;
- Comportamento digital;
- Humor e nível de cansaço;
- Tempo de estudo;
- Tempo de lazer;
- Frequência de pausas.

A partir desses dados, o sistema deve apresentar **insights acionáveis**, ajudando o estudante a identificar sinais de fadiga antes que evoluam para exaustão ou queda de desempenho.

---

## Stack sugerida

Desenvolva o projeto utilizando:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Firebase Authentication**
- **Firebase Firestore**
- **Recharts** para gráficos
- **React Hook Form** para formulários
- **Zod** para validação

Caso prefira outra stack moderna, mantenha o projeto simples, funcional e bem organizado.

---

## Funcionalidades principais

### 1. Autenticação

Implemente autenticação completa com Firebase:

- Cadastro de usuário;
- Login;
- Logout;
- Proteção de rotas privadas;
- Redirecionamento automático:
  - usuário logado vai para o dashboard;
  - usuário não logado vai para login;
- Armazenamento dos dados do usuário no Firestore.

Campos do cadastro:

- Nome completo;
- E-mail;
- Senha;
- Curso;
- Instituição;
- Período ou semestre.

---

### 2. Dashboard principal

Crie um dashboard moderno e intuitivo com os seguintes elementos:

- Saudação personalizada com o nome do estudante;
- Resumo do estado atual;
- Indicador geral de bem-estar;
- Cards com métricas principais:
  - Horas de sono;
  - Tempo de tela;
  - Tempo de estudo;
  - Tempo de lazer;
  - Humor;
  - Nível de cansaço;
  - Nível de estresse;
- Gráficos semanais;
- Área de alertas inteligentes;
- Área de recomendações personalizadas.

O visual deve transmitir:

- Clareza;
- Cuidado;
- Confiança;
- Tecnologia;
- Saúde mental;
- Ambiente acadêmico.

---

### 3. Registro diário

Crie uma página para o estudante registrar informações do dia.

Campos do formulário:

- Data;
- Horas de sono;
- Qualidade do sono de 1 a 5;
- Tempo de tela em horas;
- Tempo de estudo em horas;
- Tempo de lazer em horas;
- Humor de 1 a 5;
- Nível de cansaço de 1 a 5;
- Nível de estresse de 1 a 5;
- Observações livres sobre o dia.

Após o envio:

- Salvar os dados no Firestore;
- Associar os registros ao usuário autenticado;
- Atualizar o dashboard automaticamente.

---

### 4. Algoritmo de análise preditiva

Implemente uma lógica inicial de análise preditiva baseada em regras.

A função deve analisar os registros recentes do estudante e calcular um **índice de risco de fadiga**.

Considere fatores como:

- Poucas horas de sono;
- Sono de baixa qualidade;
- Muito tempo de tela;
- Muito tempo de estudo;
- Pouco tempo de lazer;
- Humor baixo;
- Cansaço alto;
- Estresse alto;
- Repetição de padrões negativos nos últimos dias.

Exemplo de classificação:

- 0 a 30: Baixo risco;
- 31 a 60: Risco moderado;
- 61 a 80: Risco alto;
- 81 a 100: Risco crítico.

A função deve retornar:

- Pontuação de risco;
- Classificação;
- Principais fatores detectados;
- Recomendações personalizadas.

---

### 5. Recomendações inteligentes

Com base nos dados registrados, o sistema deve gerar sugestões como:

- “Você teve pouco tempo de descanso nos últimos dias. Considere reduzir o tempo de tela antes de dormir.”
- “Seu tempo de estudo está alto e o lazer está baixo. Tente inserir pequenas pausas durante o dia.”
- “Seu nível de estresse subiu nos últimos registros. Uma pausa curta pode ajudar a recuperar o foco.”
- “Seu sono melhorou em relação aos dias anteriores. Continue mantendo esse padrão.”

As recomendações devem ser claras, humanas e não alarmistas.

Evite linguagem médica definitiva. Use termos como:

- “sinais de fadiga”;
- “possível sobrecarga”;
- “padrão de atenção”;
- “recomenda-se observar”.

---

### 6. Gráficos e histórico

Crie uma página de histórico com:

- Lista dos registros diários;
- Filtro por período;
- Gráfico de evolução do bem-estar;
- Gráfico comparando:
  - Sono;
  - Tempo de tela;
  - Estudo;
  - Lazer;
  - Estresse;
  - Cansaço.

Use Recharts para os gráficos.

---

### 7. Alertas inteligentes

O sistema deve exibir alertas quando detectar padrões preocupantes.

Exemplos:

- Sono abaixo de 6 horas por 3 dias seguidos;
- Estresse acima de 4 por 2 dias seguidos;
- Tempo de lazer zerado por mais de 2 dias;
- Tempo de tela muito alto combinado com sono ruim;
- Cansaço alto combinado com humor baixo.

Os alertas devem aparecer no dashboard em cards destacados.

---

## Estrutura de páginas

Crie as seguintes rotas:

src/
  app/
    page.tsx
    login/
    register/
    dashboard/
    registro/
    historico/
    perfil/
  components/
    ui/
    layout/
    dashboard/
    charts/
    forms/
  lib/
    firebase.ts
    auth.ts
    fatigueAnalysis.ts
    recommendations.ts
  types/
    user.ts
    dailyRecord.ts
  hooks/
    useAuth.ts
    useDailyRecords.ts
/