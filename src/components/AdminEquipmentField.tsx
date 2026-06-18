import { EQUIPMENT_OPTIONS } from '../lib/equipment';

interface AdminEquipmentFieldProps {
  equipment: string[];
  onChange: (next: string[]) => void;
}

function toggleEquipment(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function AdminEquipmentField({ equipment, onChange }: AdminEquipmentFieldProps) {
  return (
    <div className="admin-equipment">
      <p className="admin-equipment-hint">
        Usado pelo filtro avançado. Selecione todos os equipamentos do movimento (ex.: polia + barra).
      </p>
      <div className="admin-equipment-pills">
        {EQUIPMENT_OPTIONS.map(({ id, label }) => {
          const active = equipment.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`admin-equipment-pill ${active ? 'admin-equipment-pill--active' : ''}`}
              onClick={() => onChange(toggleEquipment(equipment, id))}
            >
              {label}
            </button>
          );
        })}
      </div>
      {equipment.length === 0 && (
        <p className="admin-equipment-warning">
          Nenhum equipamento selecionado — o filtro usará palpite pelo nome até você definir aqui.
        </p>
      )}
    </div>
  );
}
