import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getSettings, saveSettings } from "../services/settings";
import type { BusinessSettings } from "../services/settings";
import { toast } from "react-hot-toast";

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset } = useForm<BusinessSettings>();

    useEffect(() => {
        (async () => {
            try {
                const data = await getSettings();
                if (data) {
                    reset(data);
                }
            } catch (e) {
                console.error(e);
                toast.error("Error al cargar la configuración");
            } finally {
                setLoading(false);
            }
        })();
    }, [reset]);

    const onSubmit = async (data: BusinessSettings) => {
        setSaving(true);
        try {
            await saveSettings(data);
            toast.success("Configuración guardada satisfactoriamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al guardar la configuración");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="container">Cargando…</div>;

    return (
        <div className="container py-4">
            <div className="card">
                <h2 className="mb-2 fw-bold text-gradient">Configuración de la Empresa</h2>
                <p className="text-muted mb-4">
                    Estos datos aparecerán en los presupuestos y órdenes de trabajo en PDF.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="small fw-bold text-muted text-uppercase mb-1 d-block">Nombre de la empresa</label>
                            <input
                                {...register("name")}
                                className="form-control"
                                placeholder="Ej: Sontech Sistemas"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="small fw-bold text-muted text-uppercase mb-1 d-block">Email de contacto</label>
                            <input
                                {...register("email")}
                                className="form-control"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="small fw-bold text-muted text-uppercase mb-1 d-block">Teléfono / WhatsApp</label>
                            <input
                                {...register("phone")}
                                className="form-control"
                                placeholder="11 1234 5678"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="small fw-bold text-muted text-uppercase mb-1 d-block">Dirección</label>
                            <input
                                {...register("address")}
                                className="form-control"
                                placeholder="Calle 123, Ciudad"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="small fw-bold text-muted text-uppercase mb-1 d-block">URL del Logo (Opcional)</label>
                        <input
                            {...register("logoUrl")}
                            className="form-control"
                            placeholder="https://tu-sitio.com/logo.png"
                        />
                    </div>

                    <div>
                        <label className="small fw-bold text-muted text-uppercase mb-1 d-block">Pie de página del PDF (Opcional)</label>
                        <textarea
                            {...register("footerText")}
                            className="form-control"
                            style={{ minHeight: 100 }}
                            placeholder="Gracias por confiar en nosotros..."
                        />
                    </div>

                    <div className="d-flex justify-content-end mt-3">
                        <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                            {saving ? (
                                <><span className="spinner-border spinner-border-sm me-2"></span>Guardando…</>
                            ) : (
                                "Guardar Configuración"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
