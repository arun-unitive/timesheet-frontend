/** Standard page heading block: title, description and an actions slot. */
export default function PageHead({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <div className="page-head__title">{title}</div>
        {subtitle && <div className="page-head__sub">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
