

| ![][image1] | Especificação de Projeto |  |
| :---: | ----- | :---- |
|  | **DISCIPLINA:** Aprendizado de Máquina | **PERÍODO:** 2026.1 |
|  |  | **UNIDADE:** 2a |

## **1\. Introdução**

Este projeto visa o desenvolvimento de uma solução completa de aprendizado de máquina, contemplando desde a análise exploratória de dados até a disponibilização da solução em ambiente replicável.

O objetivo é aplicar conceitos de modelagem, validação e análise de dados, aliados a práticas de MLOps, incluindo rastreamento de experimentos, deploy de modelos e reprodutibilidade do ambiente.

O projeto deverá ser desenvolvido em grupos e corresponde a 60% da nota da segunda unidade, sendo avaliado com base na qualidade técnica da solução e na apresentação final. Os demais 40% da nota serão baseados na qualidade do relatório e apresentação do projeto.

## **2\. Objetivos**

Desenvolver uma solução de Machine Learning que atenda aos seguintes requisitos:

* Leitura e análise exploratória de dados (EDA)  
* Construção de visualizações analíticas  
* Aplicação de estratégias de validação  
* Treinamento e comparação de modelos de ML  
* Rastreamento de experimentos com MLflow  
* Desenvolvimento de dashboard interativo (ex: Streamlit, Dash, Google Looker)  
* Conteinerização da solução com Docker

## **3\. Avaliação**

### **3.1. Critérios de Avaliação:**

A avaliação do projeto será baseada nos seguintes critérios:

* Qualidade da análise de dados (EDA)  
* Clareza e relevância das visualizações  
* Correção metodológica das estratégias de validação  
* Qualidade da modelagem e escolha de métricas  
* Uso adequado de ferramentas de MLOps  
* Funcionalidade do dashboard  
* Reprodutibilidade via Docker  
* Clareza e organização do relatório (**uso obrigatório do template SBC anexo**)

Dessa forma, a nota final será calculada com base nos seguintes blocos e respectivos pesos:

| Bloco | Peso |
| :---: | :---: |
| Análise de Dados | 15% |
| Modelagem e Validação | 30% |
| MLOps (integração) | 25% |
| Comunicação (clareza) | 20% |

## **4\. Requisitos Técnicos**

O projeto deverá atender aos seguintes requisitos:

* **Dados e Análise**: Leitura de base de dados; Estatísticas descritivas; Tratamento de dados.  
* **Visualização**: Mínimo de 5 visualizações com interpretação  
* **Validação**: Holdout; Validação cruzada; Leave-One-Out (quando aplicável). Além do uso de Random Search e/ou Grid Search. Deve ser justificada a estratégia escolhida.  
* **Modelagem**: Treinamento de pelo menos dois modelos usando métricas apropriadas: KNN; Árvore de Decisão; Random Forest, AdaBoost, Multilayer Perceptron. É permitido usar um modelo adicional não discutido na disciplina **(importante validar com o professor antes).**  
* **MLflow**: Registro de parâmetros; Registro de métricas; Múltiplos experimentos; Salvamento do modelo.  
* **Dashboard**: Interface interativa; Visualização de métricas; Visualização de previsões. Não só podem como devem incluir métricas relacionadas à solução apresentada em Projeto 6\.  
* 

## **5\. Estrutura do Repositório**

A estrutura sugerida de pastas para o repositório no Github é apresentada a seguir. No entanto, ajustes podem ser aplicados para atender a proposta de cada grupo:

/  
├── data/ \# Dados  
├── notebooks/ \# EDA e experimentos  
├── src/ \# Código de treinamento  
├── app/ \# Dashboard  
├── mlruns/ \# MLflow  
├── Dockerfile  
├── requirements.txt  
├── README.md

O arquivo `README.md` deverá conter as seguintes informações:

1. Nome e sobrenome dos membros do projeto e seus respectivos **usuários no GitHub (@fulano, @beltrano, @sicrano)**.  
2. Nome da disciplina: **Machine Learning I e Projeto 3**.  
3. Nome da instituição de ensino: **CESAR School**.  
4. Nome da solução desenvolvida (sejam criativos).  
5. Instruções detalhadas para compilar e executar.  
6. Breve descrição da solução, incluindo link para o Google Sites do projeto.

**Bom trabalho\!**

[image1]: <data:image/png;base64,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>