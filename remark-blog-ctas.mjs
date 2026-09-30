export default function remarkBlogCtas() {
  return function (tree) {
    // Simple recursive visitor
    function visit(node, parent) {
      if (node.type === 'paragraph' && node.children && node.children.length === 1) {
        const child = node.children[0];
        if (child.type === 'text') {
          if (child.value.trim() === '::enroll-now') {
            node.type = 'html';
            node.value = `<div class="not-prose my-10 py-6 px-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
  <div>
    <h3 class="text-xl font-bold text-slate-900 mb-2">Ready to Start Learning?</h3>
    <p class="text-sm text-slate-600">Join our comprehensive enterprise IT training programs today.</p>
  </div>
  <a href="/contact-us/" target="_blank" class="shrink-0 inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md hover:-translate-y-0.5">
    Enroll Now
  </a>
</div>`;
            delete node.children;
          } else if (child.value.trim() === '::whatsapp-us') {
            node.type = 'html';
            node.value = `<div class="not-prose my-10 p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
  <div>
    <h3 class="text-xl font-bold text-slate-900 mb-2">Need a Demo Session? Let's Connect</h3>
    <p class="text-sm text-slate-600">Reach out to our experts directly on WhatsApp to clear your queries and get course details.</p>
  </div>
  <a href="https://wa.me/918099949888?text=Hi%20Ask4Trainings,%20I'm%20looking%20for%20online%20training%20and%20would%20like%20to%20attend%20a%20free%20live%20demo%20session." target="_blank" class="shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:-translate-y-0.5">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    WhatsApp Us
  </a>
</div>`;
            delete node.children;
          }
        }
      }

      if (node.children) {
        for (const child of node.children) {
          visit(child, node);
        }
      }
    }

    visit(tree, null);
  };
}
