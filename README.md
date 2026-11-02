# Para onde vai o seu imposto? 2.0

Site estático com as contas do Governo do Estado do Amazonas de 2019 a 2026, feito pela NEX — Hub de Análises Estratégicas.

**Acesse:** https://dsalcodaa.github.io/ONDE-VAI-O-SEU-IMPOSTO-/

## O que tem

- Receita e despesa do Estado, ano a ano e mês a mês, por área, por tipo de gasto e por Poder.
- Calendário de pagamentos: quanto o Estado pagou em cada mês, de 2019 até a data da coleta, e o mesmo para cada órgão e cada empresa.
- Página de cada órgão: quem recebeu, contratos com aditivos, contas antigas pagas (DEA), atos do Diário Oficial e contratos no PNCP.
- Página de cada empresa: quanto recebeu, de quais órgãos, em que meses e por quais contratos.
- Ranking das empresas que mais receberam e das que mais têm a receber.
- Transição de governo: contas entregues e não pagas, DEA, dívidas reconhecidas no Diário Oficial, dívida pública e contratos que passam de 2026.
- Leis sancionadas, repasses aos 62 municípios e servidores.

## Como ler

- **Reservado (empenho)**: dinheiro separado para um gasto.
- **Entregue (liquidado)**: o órgão conferiu que recebeu o bem, o serviço ou a obra.
- **Pago do ano**: pagamento de conta do próprio ano.
- **Pago de anos anteriores**: pagamento de conta registrada em ano anterior (restos a pagar).
- **Total pago**: pago do ano + pago de anos anteriores.
- **Contas antigas pagas (DEA)**: conta de ano passado que não foi registrada na época e foi paga depois. Já está dentro do pago do ano em que foi paga.

Valores nominais, como publicados, sem correção pela inflação e sem auditoria. 2026 é parcial (até a data da coleta). Pessoas físicas não têm o nome exibido.

## Fontes

SEFAZ-AM (Portal da Transparência Fiscal e Sistema de Gestão de Contratos), TCE-AM (e-Contas), Tesouro Nacional (SICONFI), Imprensa Oficial do Amazonas (Diário Oficial), Portal Nacional de Contratações Públicas (PNCP), Assembleia Legislativa (SAPL) e Receita Federal (razão social pelo CNPJ). Lista completa na página "Como ler os números" do site.

## Atualização

Os dados da pasta `data/` são gerados fora deste repositório, pelos scripts do projeto do Balanço de Transição (`atualizar.py`), que coletam de novo o ano corrente e publicam aqui. A data da última coleta aparece na página inicial do site.

A versão anterior (1.0) continua no histórico de commits.
