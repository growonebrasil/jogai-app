
-- Legal documents (current versions of terms/privacy/cookies)
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('terms','privacy','cookies')),
  version text NOT NULL,
  content_md text NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);
CREATE UNIQUE INDEX legal_documents_one_current_per_kind
  ON public.legal_documents (kind) WHERE is_current = true;

GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Legal docs are public-read"
  ON public.legal_documents FOR SELECT TO anon, authenticated USING (true);

-- Consent log
CREATE TABLE public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  cookies_version text NOT NULL,
  cookie_preferences jsonb NOT NULL DEFAULT '{"essential":true,"analytics":true,"marketing":true,"personalization":true}'::jsonb,
  ip_address text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX legal_consents_user_idx ON public.legal_consents (user_id, accepted_at DESC);

GRANT SELECT, INSERT ON public.legal_consents TO authenticated;
GRANT ALL ON public.legal_consents TO service_role;

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own consents"
  ON public.legal_consents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consents"
  ON public.legal_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Account deletion requests
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','canceled','failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX adr_user_idx ON public.account_deletion_requests (user_id, requested_at DESC);

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own deletion requests"
  ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed current versions 1.0.0
INSERT INTO public.legal_documents (kind, version, content_md, is_current) VALUES
('terms','1.0.0','# Termos de Uso do JOGA.I\n\nVersão 1.0.0 — vigente a partir de 15/06/2026.\n\nAo utilizar o aplicativo JOGA.I (“Plataforma”), você concorda integralmente com estes Termos. Caso não concorde, não utilize a Plataforma.\n\n## 1. Objeto\nO JOGA.I é uma plataforma digital que conecta organizadores e jogadores de futebol amador (“peladas”), oferecendo gestão de partidas, estatísticas, sorteio de times com inteligência artificial e funcionalidades sociais.\n\n## 2. Cadastro e conta\n2.1. O usuário deve fornecer informações verdadeiras, completas e atualizadas.\n2.2. É vedada a criação de contas falsas ou em nome de terceiros sem autorização.\n2.3. O usuário é responsável pela guarda de sua senha e por todas as ações realizadas em sua conta.\n\n## 3. Conduta\nO usuário compromete-se a:\n- Não publicar conteúdo ofensivo, discriminatório, ilícito ou que viole direitos de terceiros;\n- Não utilizar a Plataforma para fins ilícitos, fraudulentos ou que violem a legislação brasileira;\n- Respeitar os demais usuários, especialmente em chats, comentários, votações e mídias compartilhadas.\n\n## 4. Peladas e responsabilidade\n4.1. O JOGA.I é uma ferramenta de organização; a realização e os riscos das partidas são de responsabilidade exclusiva dos organizadores e jogadores.\n4.2. O JOGA.I não se responsabiliza por lesões, prejuízos materiais ou conflitos ocorridos em partidas organizadas via Plataforma.\n4.3. Pagamentos entre membros (mensalidades, diárias) ocorrem fora do escopo financeiro do JOGA.I, salvo quando expressamente intermediados.\n\n## 5. Planos e assinaturas\n5.1. O JOGA.I oferece plano gratuito (FREE) e plano pago (PRO).\n5.2. Assinaturas PRO são cobradas conforme valor e periodicidade informados no checkout, processados por provedor terceirizado (Stripe).\n5.3. O cancelamento pode ser feito a qualquer momento e produz efeitos ao final do ciclo vigente.\n\n## 6. Propriedade intelectual\nTodo o software, marca, layout e identidade visual do JOGA.I são protegidos. O conteúdo gerado pelo usuário (publicações, mídias) permanece de sua titularidade; ao publicar, o usuário concede licença não exclusiva ao JOGA.I para exibi-lo na Plataforma.\n\n## 7. Suspensão e encerramento\nO JOGA.I poderá suspender ou encerrar contas que violem estes Termos, sem prévio aviso, mediante registro do motivo.\n\n## 8. Limitação de responsabilidade\nA Plataforma é fornecida “como está”. O JOGA.I não garante disponibilidade ininterrupta nem se responsabiliza por danos indiretos decorrentes do uso.\n\n## 9. Alterações\nEstes Termos podem ser atualizados. Mudanças relevantes exigirão novo aceite ao próximo login.\n\n## 10. Lei aplicável e foro\nAplica-se a legislação brasileira. Fica eleito o foro do domicílio do consumidor para dirimir controvérsias.\n\n## 11. Contato\nDúvidas: contato@jogai.app', true),
('privacy','1.0.0','# Política de Privacidade do JOGA.I\n\nVersão 1.0.0 — vigente a partir de 15/06/2026.\n\nEsta Política descreve como o JOGA.I (“nós”) trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).\n\n## 1. Dados coletados\n- **Cadastro:** nome, e-mail, nome de usuário, posição, pé dominante.\n- **Perfil e desempenho:** estatísticas, votos recebidos, conquistas, carta de jogador, XP.\n- **Mídia:** avatar e publicações no feed (texto, imagens, vídeos).\n- **Atividade:** participação em peladas, presença, eventos de partidas.\n- **Pagamentos PRO:** dados tratados diretamente pelo provedor (Stripe). Não armazenamos dados de cartão.\n- **Técnicos:** IP, navegador, dispositivo, identificadores de sessão.\n\n## 2. Bases legais (LGPD)\n- Execução de contrato (uso da Plataforma);\n- Cumprimento de obrigação legal;\n- Legítimo interesse (segurança, prevenção a fraudes);\n- Consentimento (cookies não essenciais, comunicações de marketing).\n\n## 3. Finalidades\n- Prestar os serviços do JOGA.I;\n- Personalizar a experiência e calcular estatísticas/ranking;\n- Garantir segurança e integridade;\n- Comunicar atualizações e novidades (com consentimento);\n- Cumprir obrigações legais e regulatórias.\n\n## 4. Compartilhamento\nCompartilhamos dados apenas com: provedores de infraestrutura (Supabase/Lovable Cloud), processador de pagamento (Stripe) e autoridades quando exigido por lei. Nunca vendemos seus dados.\n\n## 5. Cookies\nUtilizamos cookies essenciais, analíticos, de marketing e personalização. Detalhes na Política de Cookies.\n\n## 6. Retenção\nMantemos seus dados enquanto sua conta estiver ativa ou conforme exigência legal. Após exclusão, dados pessoais são removidos ou anonimizados em até 30 dias.\n\n## 7. Direitos do titular\nVocê pode, a qualquer momento: confirmar tratamento, acessar, corrigir, anonimizar, portar, eliminar dados, revogar consentimento e solicitar informações sobre compartilhamento. Use o menu Privacidade e dados ou contate o encarregado: dpo@jogai.app.\n\n## 8. Segurança\nAdotamos medidas técnicas e administrativas (criptografia em trânsito, controle de acesso, RLS no banco) para proteger seus dados.\n\n## 9. Transferência internacional\nAlguns provedores podem processar dados fora do Brasil, sempre com garantias adequadas conforme LGPD.\n\n## 10. Crianças e adolescentes\nA Plataforma destina-se a maiores de 13 anos. Menores devem utilizá-la com autorização e supervisão dos responsáveis.\n\n## 11. Atualizações\nAlterações relevantes exigirão novo aceite ao próximo login.\n\n## 12. Encarregado (DPO)\ndpo@jogai.app', true),
('cookies','1.0.0','# Política de Cookies do JOGA.I\n\nVersão 1.0.0 — vigente a partir de 15/06/2026.\n\nUtilizamos cookies e tecnologias similares (localStorage, sessionStorage) para oferecer, proteger e melhorar o JOGA.I.\n\n## 1. O que são cookies\nCookies são pequenos arquivos armazenados no seu dispositivo que permitem reconhecer preferências e sessões.\n\n## 2. Categorias\n- **Essenciais (sempre ativos):** autenticação, segurança, preferências básicas. Sem eles a Plataforma não funciona.\n- **Desempenho/Análise (opcional):** métricas anônimas de uso, performance e estabilidade.\n- **Marketing (opcional):** campanhas e mensuração de conversões.\n- **Personalização (opcional):** lembrar preferências de interface, idioma e conteúdo recomendado.\n\n## 3. Gerenciamento\nVocê pode gerenciar suas preferências a qualquer momento em **Privacidade e dados → Gerenciar cookies**. Cookies essenciais não podem ser desativados.\n\n## 4. Consentimento\nNo primeiro acesso, exibimos um banner para você aceitar todos, recusar não essenciais ou ajustar manualmente. Sua escolha é registrada.\n\n## 5. Terceiros\nProvedores como Stripe (pagamentos) e Supabase (infraestrutura) podem definir cookies próprios, regidos por suas respectivas políticas.\n\n## 6. Atualizações\nEsta política pode ser alterada. Mudanças relevantes exigirão novo consentimento.\n\n## 7. Contato\ndpo@jogai.app', true);
