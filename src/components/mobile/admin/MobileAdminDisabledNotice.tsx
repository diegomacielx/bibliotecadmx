import { Icon } from '../../Icon';

export function MobileAdminDisabledNotice() {
  return (
    <div className="mobile-admin-disabled cinema-container py-fluid-xl">
      <div className="mobile-admin-disabled__card">
        <div className="mobile-admin-disabled__icon" aria-hidden="true">
          <Icon name="dashboard" className="w-8 h-8" />
        </div>
        <h2 className="mobile-admin-disabled__title">Admin no celular indisponível</h2>
        <p className="mobile-admin-disabled__text">
          As ferramentas de gestão (alunos, pedidos, importação, campanhas) foram otimizadas para
          desktop. Use um computador para administrar a biblioteca.
        </p>
        <p className="mobile-admin-disabled__hint">
          Você ainda pode usar <strong>Visão de usuário</strong> no menu da conta para ver o site
          como um aluno.
        </p>
      </div>
    </div>
  );
}
