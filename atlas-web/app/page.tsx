import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Diagnostico from "@/components/Diagnostico";
import WhyAtlas from "@/components/WhyAtlas";
import Services from "@/components/Services";
import Projects from "@/components/Projects";
import About from "@/components/About";
import Process from "@/components/Process";
import Maintenance from "@/components/Maintenance";
import Faq from "@/components/Faq";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Diagnostico />
        <WhyAtlas />
        <Services />
        <Projects />
        <About />
        <Process />
        <Maintenance />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
