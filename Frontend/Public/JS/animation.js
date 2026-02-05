
        const candidate = document.getElementById("candidate");
        const recruiter = document.getElementById("recruiter");

        const candidateLabel = document.querySelector('label[for="candidate"]');
        const recruiterLabel = document.querySelector('label[for="recruiter"]');
        const submitbutton = document.querySelector('#signinbutton')

        function colorswitch() {
            if (candidate.checked) {
            candidateLabel.classList.add("bg-blue-600", "text-white", "shadow-md");
            candidateLabel.classList.remove("bg-white", "text-gray-700");

            submitbutton.classList.add("border-blue-600", "bg-blue-600");
            submitbutton.classList.remove("border-rose-800", "bg-rose-800");

            recruiterLabel.classList.add("bg-white", "text-gray-700");
            recruiterLabel.classList.remove("bg-blue-600", "text-white", "shadow-md");
            } else {
            recruiterLabel.classList.add("bg-rose-800", "text-white", "shadow-md");
            recruiterLabel.classList.remove("bg-white", "text-gray-700");

            candidateLabel.classList.add("bg-white", "text-gray-700");
            candidateLabel.classList.remove("bg-blue-600", "text-white", "shadow-md");

            submitbutton.classList.add("border-rose-800", "bg-rose-800");
            submitbutton.classList.remove("border-blue-600", "bg-blue-600");
            }
        }

        candidate.addEventListener("change", colorswitch);
        recruiter.addEventListener("change", colorswitch);
        
        colorswitch();
