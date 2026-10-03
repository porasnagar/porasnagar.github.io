import { profile } from '../content/profile'

export function Aux() {
  return (
    <div className="aux os-scroll">
      <h2>{profile.name}</h2>
      <p className="sub">
        {profile.current} · {profile.location}
      </p>
      <p>{profile.summary}</p>
      <h3>What I work on</h3>
      <ul>
        {profile.focus.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <h3>Tools</h3>
      <p className="credits">{profile.skills.join(' · ')}</p>
      <h3>Education</h3>
      <p>{profile.education}</p>
      <h3>Elsewhere</h3>
      <p className="links">
        {Object.entries(profile.links).map(([k, href]) => (
          <a key={k} href={href} target="_blank" rel="noreferrer">
            {k === 'github' ? 'GitHub' : k === 'linkedin' ? 'LinkedIn' : k[0].toUpperCase() + k.slice(1)}
          </a>
        ))}
      </p>
    </div>
  )
}
