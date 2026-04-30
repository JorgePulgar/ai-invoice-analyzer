import { Layout } from '../components/Layout';

export function UploadPage() {
  // TODO: render DropZone component, validate type/size, call api.uploadFactura,
  // show loading state during upload, render extracted JSON on success,
  // render error message on failure.
  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-4">Subir factura</h2>
      <p className="text-slate-500 text-sm">TODO: implement drag &amp; drop upload</p>
    </Layout>
  );
}
